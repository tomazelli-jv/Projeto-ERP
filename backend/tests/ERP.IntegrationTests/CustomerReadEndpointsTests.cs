using System.Net;
using System.Net.Http.Json;
using Dapper;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.IntegrationTests;

// HTTP and real-SQL cases protect authentication, deterministic pagination, and company-wide isolation.
[Collection(DatabaseCollection.Name)]
public sealed class CustomerReadEndpointsTests(DatabaseFixture database)
{
    [Fact]
    public async Task RoutesRequireAuthentication()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/v1/clientes/{Guid.NewGuid()}")).StatusCode);
        // Rotas de escrita permanecem protegidas mesmo quando o corpo Ã© sintaticamente vÃ¡lido.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/clientes", WritePayload())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PutAsJsonAsync($"/api/v1/clientes/{Guid.NewGuid()}", WritePayload())).StatusCode);
    }

    [Fact]
    public async Task ServiceListsCompanyWideCustomersAndHidesForeignDetails()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var ownCompany = Guid.NewGuid().ToString(); var foreignCompany = Guid.NewGuid().ToString();
        var activeStore = Guid.NewGuid().ToString(); var otherStore = Guid.NewGuid().ToString(); var foreignStore = Guid.NewGuid().ToString();
        var own = Guid.NewGuid().ToString(); var sameCompanyOtherStore = Guid.NewGuid().ToString(); var foreign = Guid.NewGuid().ToString();
        await using (var connection = await source.OpenConnectionAsync())
        {
            await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Own,'Empresa Cliente'),(@Foreign,'Empresa Externa')", new { Own = ownCompany, Foreign = foreignCompany });
            await connection.ExecuteAsync("INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento) VALUES (@Active,@Own,'Loja A','Loja A',@D1),(@Other,@Own,'Loja B','Loja B',@D2),(@ForeignStore,@Foreign,'Loja X','Loja X',@D3)", new { Active = activeStore, Other = otherStore, ForeignStore = foreignStore, Own = ownCompany, Foreign = foreignCompany, D1 = Document(), D2 = Document(), D3 = Document() });
            // id_loja_cadastro records provenance; both stores in the same company must remain visible from the active store.
            await connection.ExecuteAsync("INSERT INTO cliente (id_cliente,id_empresa,id_loja_cadastro,nome_fantasia,razao_social,tipo,documento,email,ativo) VALUES (@OwnId,@Own,@Active,'Ana Cliente',NULL,'PF','12345678901','ana@example.test',1),(@OtherId,@Own,@Other,'Beta Empresa','Beta Ltda','PJ','12ABC34501DE35','beta@example.test',0),(@ForeignId,@Foreign,@ForeignStore,'Cliente Externo',NULL,'PF',NULL,NULL,1)", new { OwnId = own, OtherId = sameCompanyOtherStore, ForeignId = foreign, Own = ownCompany, Foreign = foreignCompany, Active = activeStore, Other = otherStore, ForeignStore = foreignStore });
        }
        var service = new CustomerService(new MariaDbConnectionFactory(source), new FixedContext(ownCompany, activeStore), new CustomerRepository());
        var page = await service.ListAsync("user", activeStore, new CustomerListQuery { Page = 1, PageSize = 20 }, CancellationToken.None);
        Assert.Equal(2, page.Pagination.TotalItems);
        Assert.Contains(page.Data, item => item.IdCliente == sameCompanyOtherStore && item.LojaCadastro.IdLoja == otherStore);
        Assert.DoesNotContain(page.Data, item => item.IdCliente == foreign);
        Assert.Single((await service.ListAsync("user", activeStore, new CustomerListQuery { Search = "12.ABC.345/01DE-35", Tipo = "pj", Ativo = false }, CancellationToken.None)).Data);
        Assert.Equal(own, (await service.FindAsync("user", activeStore, own, CancellationToken.None)).IdCliente);
        Assert.Equal("CLIENTE_NOT_FOUND", (await Assert.ThrowsAsync<ERP.Domain.Errors.DomainException>(() => service.FindAsync("user", activeStore, foreign, CancellationToken.None))).Code);
    }

    // Numeric fixture documents only satisfy store structural checks and remain unique across a shared test database.
    private static string Document() => Random.Shared.NextInt64(10000000000000, 99999999999999).ToString();

    // O payload omite deliberadamente ids empresariais porque esses valores nunca pertencem ao cliente HTTP.
    private static CustomerWriteRequest WritePayload() => new()
    {
        NomeFantasia = "Cliente protegido",
        Tipo = "PF",
        Ativo = true
    };

    private sealed class FixedContext(string companyId, string storeId) : IOperationalContextResolver
    {
        public Task<OperationalContextResponse> GetAsync(string userId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<OperationalContext> ResolveRequiredStoreAsync(string userId, string? requestedStoreId, CancellationToken cancellationToken = default) =>
            Task.FromResult(new OperationalContext(userId, "employee", companyId, storeId));
    }
}
