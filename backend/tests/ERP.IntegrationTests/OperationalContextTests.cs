using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Dapper;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Cenários usam MariaDB isolado quando habilitado para provar vínculos e bloqueios que mocks não representam.
[Collection(DatabaseCollection.Name)]
public sealed class OperationalContextTests(DatabaseFixture database)
{
    [Fact]
    public async Task Endpoint_RequiresAuthentication()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/contexto")).StatusCode);
    }

    [Fact]
    public async Task Context_ListsOnlyLinkedStoresAndResolverRejectsInvalidOperationalScope()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory();
        var suffix = Guid.NewGuid().ToString("N");
        var userId = Guid.NewGuid().ToString();
        var employeeId = Guid.NewGuid().ToString();
        var companyId = Guid.NewGuid().ToString();
        var foreignCompanyId = Guid.NewGuid().ToString();
        var activeStoreId = Guid.NewGuid().ToString();
        var inactiveStoreId = Guid.NewGuid().ToString();
        var unlinkedStoreId = Guid.NewGuid().ToString();
        var foreignStoreId = Guid.NewGuid().ToString();
        var email = $"context-{suffix}@example.test";
        const string password = "senha segura para contexto";

        await using (var setup = await source.OpenConnectionAsync())
        {
            var hash = await factory.Services.GetRequiredService<IPasswordHasher>().HashAsync(password);
            await setup.ExecuteAsync("INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@Name,@Hash,@Email,1)", new { Id = userId, Name = $"context.{suffix}", Hash = hash, Email = email });
            await setup.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Own,'Empresa Contexto'),(@Foreign,'Empresa Externa')", new { Own = companyId, Foreign = foreignCompanyId });
            await setup.ExecuteAsync("INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@CompanyId,'Funcionário Contexto')", new { Id = employeeId, UserId = userId, CompanyId = companyId });
            await setup.ExecuteAsync("""
                INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,cidade,uf,ativo) VALUES
                (@Active,@Company,'Ativa Ltda','Loja Ativa',@Doc1,'Araguaína','TO',1),
                (@Inactive,@Company,'Inativa Ltda','Loja Inativa',@Doc2,'Palmas','TO',0),
                (@Unlinked,@Company,'Sem Vínculo Ltda','Loja Sem Vínculo',@Doc3,'Gurupi','TO',1),
                (@Foreign,@ForeignCompany,'Externa Ltda','Loja Externa',@Doc4,'Belém','PA',1)
                """, new
            {
                Active = activeStoreId,
                Inactive = inactiveStoreId,
                Unlinked = unlinkedStoreId,
                Foreign = foreignStoreId,
                Company = companyId,
                ForeignCompany = foreignCompanyId,
                Doc1 = Document(),
                Doc2 = Document(),
                Doc3 = Document(),
                Doc4 = Document()
            });
            await setup.ExecuteAsync("INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Link1,@Employee,@Active,@Company),(@Link2,@Employee,@Inactive,@Company)",
                new { Link1 = Guid.NewGuid().ToString(), Link2 = Guid.NewGuid().ToString(), Employee = employeeId, Active = activeStoreId, Inactive = inactiveStoreId, Company = companyId });
        }

        var login = await factory.Services.GetRequiredService<AuthenticationService>().LoginAsync(
            new LoginRequest { Email = email, Password = password }, null, "operational-context-test", CancellationToken.None);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        using var response = await client.GetAsync("/api/v1/contexto");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = json.RootElement.GetProperty("data");
        Assert.Equal(companyId, data.GetProperty("empresa").GetProperty("id").GetString());
        Assert.Equal(employeeId, data.GetProperty("funcionario").GetProperty("id").GetString());
        var stores = data.GetProperty("lojas").EnumerateArray().ToArray();
        Assert.Equal(2, stores.Length);
        Assert.Contains(stores, item => item.GetProperty("id").GetString() == inactiveStoreId && !item.GetProperty("ativo").GetBoolean());
        Assert.DoesNotContain(stores, item => item.GetProperty("id").GetString() is var id && (id == unlinkedStoreId || id == foreignStoreId));

        var resolver = factory.Services.GetRequiredService<IOperationalContextResolver>();
        var valid = await resolver.ResolveRequiredStoreAsync(userId, activeStoreId);
        Assert.Equal((userId, employeeId, companyId, activeStoreId), (valid.UserId, valid.EmployeeId, valid.CompanyId, valid.StoreId));
        await AssertCodeAsync("STORE_CONTEXT_REQUIRED", () => resolver.ResolveRequiredStoreAsync(userId, null));
        await AssertCodeAsync("STORE_NOT_FOUND", () => resolver.ResolveRequiredStoreAsync(userId, unlinkedStoreId));
        await AssertCodeAsync("STORE_NOT_FOUND", () => resolver.ResolveRequiredStoreAsync(userId, foreignStoreId));
        await AssertCodeAsync("STORE_NOT_FOUND", () => resolver.ResolveRequiredStoreAsync(userId, Guid.NewGuid().ToString()));
        await AssertCodeAsync("STORE_INACTIVE", () => resolver.ResolveRequiredStoreAsync(userId, inactiveStoreId));
    }

    [Fact]
    public async Task Context_DistinguishesMissingBusinessEmptyStoresAndInactiveCompany()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var service = new OperationalContextService(new MariaDbConnectionFactory(source), new ERP.Infrastructure.Persistence.OperationalContextRepository());
        var suffix = Guid.NewGuid().ToString("N");
        var missingUserId = Guid.NewGuid().ToString();
        var emptyUserId = Guid.NewGuid().ToString();
        var inactiveUserId = Guid.NewGuid().ToString();
        var activeCompanyId = Guid.NewGuid().ToString();
        var inactiveCompanyId = Guid.NewGuid().ToString();

        await using (var setup = await source.OpenConnectionAsync())
        {
            // Hash fictício nunca é usado para login; o cenário testa somente resolução empresarial.
            await setup.ExecuteAsync("INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Missing,@MissingName,'unused',@MissingEmail,1),(@Empty,@EmptyName,'unused',@EmptyEmail,1),(@Inactive,@InactiveName,'unused',@InactiveEmail,1)",
                new { Missing = missingUserId, MissingName = $"missing.{suffix}", MissingEmail = $"missing-{suffix}@example.test", Empty = emptyUserId, EmptyName = $"empty.{suffix}", EmptyEmail = $"empty-{suffix}@example.test", Inactive = inactiveUserId, InactiveName = $"inactive.{suffix}", InactiveEmail = $"inactive-{suffix}@example.test" });
            await setup.ExecuteAsync("INSERT INTO empresa (id_empresa,nome,ativo) VALUES (@Active,'Empresa sem lojas',1),(@Inactive,'Empresa inativa',0)", new { Active = activeCompanyId, Inactive = inactiveCompanyId });
            await setup.ExecuteAsync("INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Employee1,@Empty,@Active,'Sem Lojas'),(@Employee2,@Inactive,@InactiveCompany,'Empresa Inativa')",
                new { Employee1 = Guid.NewGuid().ToString(), Empty = emptyUserId, Active = activeCompanyId, Employee2 = Guid.NewGuid().ToString(), Inactive = inactiveUserId, InactiveCompany = inactiveCompanyId });
        }

        await AssertDomainCodeAsync("BUSINESS_CONTEXT_REQUIRED", () => service.GetAsync(missingUserId));
        Assert.Empty((await service.GetAsync(emptyUserId)).Lojas);
        await AssertDomainCodeAsync("BUSINESS_INACTIVE", () => service.GetAsync(inactiveUserId));
    }

    // Códigos de domínio são parte do contrato e não devem depender do texto interno da exceção.
    private static async Task AssertCodeAsync(string code, Func<Task<OperationalContext>> action)
    {
        var error = await Assert.ThrowsAsync<DomainException>(action);
        Assert.Equal(code, error.Code);
    }

    // Variante de descoberta valida falhas antes de existir uma loja selecionada.
    private static async Task AssertDomainCodeAsync(string code, Func<Task<OperationalContextResponse>> action)
    {
        var error = await Assert.ThrowsAsync<DomainException>(action);
        Assert.Equal(code, error.Code);
    }

    private static string Document() => Random.Shared.NextInt64(10000000000000, 99999999999999).ToString();
}
