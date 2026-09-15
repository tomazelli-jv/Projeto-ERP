using Dapper;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Exercita SQL, constraints e transaÃ§Ãµes reais; cada cenÃ¡rio cria documentos exclusivos no banco compartilhado do CI.
[Collection(DatabaseCollection.Name)]
public sealed class CustomerWritePersistenceTests(DatabaseFixture database)
{
    [Fact]
    public async Task CreateAndUpdateAreCompanyWideAndPreserveRegistrationStore()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var fixture = await CreateContextAsync(source);
        var context = new MutableContext(fixture.CompanyId, fixture.FirstStoreId);
        var service = new CustomerService(new MariaDbConnectionFactory(source), context, new CustomerRepository());
        var cpf = ValidCpf();

        var created = await service.CreateAsync("user", fixture.FirstStoreId, Request("PF", cpf, true), CancellationToken.None);
        Assert.Equal(cpf, created.Documento);
        Assert.Equal(fixture.FirstStoreId, created.LojaCadastro.IdLoja);

        // Editar pela segunda loja da mesma empresa prova visibilidade company-wide sem alterar a proveniÃªncia.
        context.StoreId = fixture.SecondStoreId;
        var updated = await service.UpdateAsync("user", fixture.SecondStoreId, created.IdCliente, Request("PF", cpf, false), CancellationToken.None);
        Assert.False(updated.Ativo);
        Assert.Equal(fixture.FirstStoreId, updated.LojaCadastro.IdLoja);
    }

    [Fact]
    public async Task DuplicateDocumentRollsBackAndSameDocumentIsAllowedInAnotherCompany()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var first = await CreateContextAsync(source); var second = await CreateContextAsync(source);
        var cpf = ValidCpf();
        var firstService = Service(source, first); var secondService = Service(source, second);

        await firstService.CreateAsync("user", first.FirstStoreId, Request("PF", cpf, true), CancellationToken.None);
        var conflict = await Assert.ThrowsAsync<DomainException>(() => firstService.CreateAsync("user", first.FirstStoreId, Request("PF", cpf, true), CancellationToken.None));
        Assert.Equal("CLIENTE_DOCUMENTO_ALREADY_EXISTS", conflict.Code);
        _ = await secondService.CreateAsync("user", second.FirstStoreId, Request("PF", cpf, true), CancellationToken.None);

        await using var connection = await source.OpenConnectionAsync();
        // A transaÃ§Ã£o rejeitada nÃ£o pode deixar uma segunda linha parcial na primeira empresa.
        Assert.Equal(1, await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM cliente WHERE id_empresa=@CompanyId AND documento=@Document", new { first.CompanyId, Document = cpf }));
    }

    [Fact]
    public async Task UpdateCannotEnumerateOrMutateForeignCustomer()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var owner = await CreateContextAsync(source); var foreign = await CreateContextAsync(source);
        var customer = await Service(source, owner).CreateAsync("user", owner.FirstStoreId, Request("PF", ValidCpf(), true), CancellationToken.None);

        var error = await Assert.ThrowsAsync<DomainException>(() => Service(source, foreign).UpdateAsync("user", foreign.FirstStoreId, customer.IdCliente, Request("PF", ValidCpf(), false), CancellationToken.None));
        Assert.Equal("CLIENTE_NOT_FOUND", error.Code);
    }

    private static CustomerService Service(MySqlDataSource source, Fixture fixture) =>
        new(new MariaDbConnectionFactory(source), new MutableContext(fixture.CompanyId, fixture.FirstStoreId), new CustomerRepository());

    private static CustomerWriteRequest Request(string type, string? document, bool active) => new()
    {
        NomeFantasia = " Cliente de integraÃ§Ã£o ",
        Tipo = type,
        Documento = document,
        Email = $"cliente-{Guid.NewGuid():N}@example.test",
        Uf = "TO",
        Cep = "77000000",
        Ativo = active
    };

    private static async Task<Fixture> CreateContextAsync(MySqlDataSource source)
    {
        var company = Guid.NewGuid().ToString(); var first = Guid.NewGuid().ToString(); var second = Guid.NewGuid().ToString();
        await using var connection = await source.OpenConnectionAsync();
        await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Company,'Empresa Clientes')", new { Company = company });
        await connection.ExecuteAsync("INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,uf) VALUES (@First,@Company,'Primeira Ltda','Primeira',@FirstDocument,'TO'),(@Second,@Company,'Segunda Ltda','Segunda',@SecondDocument,'TO')", new { First = first, Second = second, Company = company, FirstDocument = StoreDocument(), SecondDocument = StoreDocument() });
        return new(company, first, second);
    }

    // Os nove primeiros dÃ­gitos variam por execuÃ§Ã£o; os dois verificadores sÃ£o calculados para produzir CPF real e isolado.
    private static string ValidCpf()
    {
        var root = Random.Shared.Next(100000000, 999999999).ToString();
        var first = CpfDigit(root, 10); var second = CpfDigit(root + first, 11);
        return root + first + second;
    }

    private static int CpfDigit(string value, int weight)
    {
        var remainder = value.Select((character, index) => (character - '0') * (weight - index)).Sum() % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    private static string StoreDocument() => Random.Shared.NextInt64(10000000000000, 99999999999999).ToString();
    private sealed record Fixture(string CompanyId, string FirstStoreId, string SecondStoreId);

    private sealed class MutableContext(string companyId, string storeId) : IOperationalContextResolver
    {
        public string StoreId { get; set; } = storeId;
        public Task<OperationalContextResponse> GetAsync(string userId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<OperationalContext> ResolveRequiredStoreAsync(string userId, string? requestedStoreId, CancellationToken cancellationToken = default) =>
            Task.FromResult(new OperationalContext(userId, "employee", companyId, StoreId));
    }
}
