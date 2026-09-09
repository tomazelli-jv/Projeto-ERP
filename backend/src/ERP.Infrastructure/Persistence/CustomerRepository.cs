using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

// UUIDs are cast explicitly because MariaDB CHAR(36) may otherwise materialize as Guid.
public sealed record CustomerRow(string IdCliente, string NomeFantasia, string? RazaoSocial, string Tipo,
    string? Documento, string? Telefone, string? Email, string? Cep, string? Cidade, string? Rua, string? Uf,
    bool Ativo, string IdLoja, string LojaNomeFantasia, DateTime DataCadastro);

public sealed class CustomerRepository
{
    private const string Columns = "CAST(c.id_cliente AS CHAR(36)) IdCliente,c.nome_fantasia NomeFantasia,c.razao_social RazaoSocial,c.tipo Tipo,c.documento Documento,c.telefone Telefone,c.email Email,c.cep Cep,c.cidade Cidade,c.rua Rua,c.uf Uf,c.ativo Ativo,CAST(l.id_loja AS CHAR(36)) IdLoja,l.nome_fantasia LojaNomeFantasia,c.data_cadastro DataCadastro";

    // CompanyId is always server-derived; the active store is provenance validation, never a customer visibility predicate.
    public async Task<(IReadOnlyList<CustomerRow> Items, long Total)> ListAsync(MySqlConnection connection, string companyId,
        int offset, int limit, string? search, string? documentSearch, string? type, bool? active, CancellationToken token)
    {
        const string filter = "c.id_empresa=@CompanyId AND (@Type IS NULL OR c.tipo=@Type) AND (@Active IS NULL OR c.ativo=@Active) AND (@Search IS NULL OR c.nome_fantasia LIKE @Search ESCAPE '=' OR c.razao_social LIKE @Search ESCAPE '=' OR c.email LIKE @Search ESCAPE '=' OR c.telefone LIKE @Search ESCAPE '=' OR (@DocumentSearch IS NOT NULL AND c.documento LIKE @DocumentSearch ESCAPE '='))";
        var args = new { CompanyId = companyId, Offset = offset, Limit = limit, Search = search, DocumentSearch = documentSearch, Type = type, Active = active };
        var total = await connection.ExecuteScalarAsync<long>(new CommandDefinition($"SELECT COUNT(*) FROM cliente c WHERE {filter}", args, cancellationToken: token));
        var rows = await connection.QueryAsync<CustomerRow>(new CommandDefinition($"SELECT {Columns} FROM cliente c INNER JOIN loja l ON l.id_empresa=c.id_empresa AND l.id_loja=c.id_loja_cadastro WHERE {filter} ORDER BY c.nome_fantasia ASC,c.id_cliente ASC LIMIT @Limit OFFSET @Offset", args, cancellationToken: token));
        return (rows.AsList(), total);
    }

    // Returning null for both unknown and foreign ids guarantees non-enumerating 404 behavior.
    public Task<CustomerRow?> FindAsync(MySqlConnection connection, string companyId, string customerId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<CustomerRow>(new CommandDefinition(
            $"SELECT {Columns} FROM cliente c INNER JOIN loja l ON l.id_empresa=c.id_empresa AND l.id_loja=c.id_loja_cadastro WHERE c.id_empresa=@CompanyId AND c.id_cliente=@CustomerId LIMIT 1",
            new { CompanyId = companyId, CustomerId = customerId }, cancellationToken: token));
}
