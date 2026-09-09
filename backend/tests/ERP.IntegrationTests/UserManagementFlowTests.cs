using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using ERP.AdminCli;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Fluxo atravessa HTTP, autenticação, RBAC e MariaDB real quando o ambiente fornece banco isolado.
[Collection(DatabaseCollection.Name)]
public sealed class UserManagementFlowTests(DatabaseFixture database)
{
    [Fact]
    public async Task Routes_RequireAuthentication()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/usuarios")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/funcionarios")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/perfis")).StatusCode);
    }

    [Fact]
    public async Task Administrator_CreatesReadsUpdatesAndDeactivatesScopedUser()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory();
        var suffix = Guid.NewGuid().ToString("N");
        var actorId = Guid.NewGuid().ToString();
        var actorEmail = $"manager-{suffix}@example.test";
        const string actorPassword = "senha segura do administrador";
        var empresaId = Guid.NewGuid().ToString();
        var actorEmployeeId = Guid.NewGuid().ToString();
        var storeId = Guid.NewGuid().ToString();
        var foreignCompanyId = Guid.NewGuid().ToString();
        var foreignStoreId = Guid.NewGuid().ToString();

        await using (var setup = await source.OpenConnectionAsync())
        {
            var hash = await factory.Services.GetRequiredService<IPasswordHasher>().HashAsync(actorPassword);
            await setup.ExecuteAsync("INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@Name,@Hash,@Email,1)", new { Id = actorId, Name = $"manager.{suffix}", Hash = hash, Email = actorEmail });
            await setup.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Own,'Empresa Gestão'),(@Foreign,'Empresa Externa')", new { Own = empresaId, Foreign = foreignCompanyId });
            await setup.ExecuteAsync("INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@CompanyId,'Administrador')", new { Id = actorEmployeeId, UserId = actorId, CompanyId = empresaId });
            await setup.ExecuteAsync("INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,uf) VALUES (@Own,@Company,'Loja Gestão Ltda','Loja Gestão',@Doc1,'SP'),(@Foreign,@ForeignCompany,'Loja Externa Ltda','Loja Externa',@Doc2,'TO')",
                new { Own = storeId, Company = empresaId, Doc1 = $"{Random.Shared.NextInt64(10000000000000, 99999999999999)}", Foreign = foreignStoreId, ForeignCompany = foreignCompanyId, Doc2 = $"{Random.Shared.NextInt64(10000000000000, 99999999999999)}" });
        }
        await new EnsureRbacService(new MariaDbConnectionFactory(source)).EnsureAsync(actorEmail);
        var token = (await factory.Services.GetRequiredService<AuthenticationService>().LoginAsync(new LoginRequest { Email = actorEmail, Password = actorPassword }, null, "user-management-test", CancellationToken.None)).AccessToken;
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var profile = Assert.Single((await (await client.GetAsync("/api/v1/perfis")).Content.ReadFromJsonAsync<ApiList<ManagedProfile>>())!.Data);

        var newEmail = $"employee-{suffix}@example.test";
        var create = await client.PostAsJsonAsync("/api/v1/usuarios-funcionarios", new
        {
            userName = $"employee.{suffix}",
            email = newEmail,
            password = "senha segura do funcionario",
            nomeFuncionario = "Funcionário Gerenciado",
            ativo = true,
            idPerfil = profile.IdPerfil,
            idsLojas = new[] { storeId }
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<ApiItem<ManagedUserDetail>>())!.Data;
        Assert.Equal(empresaId, await FindEmployeeCompanyAsync(source, created.IdUsuario));
        Assert.DoesNotContain("password", await create.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        var list = (await (await client.GetAsync("/api/v1/usuarios")).Content.ReadFromJsonAsync<ApiList<ManagedUserListItem>>())!.Data;
        Assert.Contains(list, item => item.IdUsuario == created.IdUsuario && item.QuantidadeLojas == 1);
        Assert.DoesNotContain(list, item => item.Email.Contains("externa", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/v1/funcionarios/{created.Funcionario.IdFuncionario}/lojas", new { idsLojas = new[] { foreignStoreId } })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/v1/usuarios-funcionarios", new { userName = $"other.{suffix}", email = newEmail, password = "senha segura do funcionario", nomeFuncionario = "Duplicado", ativo = true, idPerfil = profile.IdPerfil, idsLojas = Array.Empty<string>() })).StatusCode);

        var updated = await client.PutAsJsonAsync($"/api/v1/usuarios/{created.IdUsuario}", new { userName = $"updated.{suffix}", email = $"updated-{suffix}@example.test", ativo = false });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        await using var verification = await source.OpenConnectionAsync();
        Assert.Equal(0, await verification.ExecuteScalarAsync<int>("SELECT ativo FROM usuarios WHERE id_usuario=@Id", new { Id = created.IdUsuario }));
        Assert.Equal(0, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sessao_usuario WHERE id_usuario=@Id AND revogada_em IS NULL", new { Id = created.IdUsuario }));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync($"/api/v1/usuarios/{actorId}", new { userName = $"manager.{suffix}", email = actorEmail, ativo = false })).StatusCode);
    }

    private static async Task<string?> FindEmployeeCompanyAsync(MySqlDataSource source, string userId)
    {
        await using var connection = await source.OpenConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<string>("SELECT CAST(id_empresa AS CHAR(36)) FROM funcionario WHERE id_usuario=@UserId", new { UserId = userId });
    }

    // Envelopes locais espelham apenas o formato comum { data } da API.
    private sealed record ApiItem<T>(T Data);
    private sealed record ApiList<T>(IReadOnlyList<T> Data);
}
