using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

// Records internos materializam CHAR(36) explicitamente como string e não atravessam a API.
public sealed record OperationalIdentityRow(string UserId, string UserName, string Email, string EmployeeId,
    string EmployeeName, string CompanyId, string CompanyName, bool CompanyActive);
public sealed record OperationalStoreRow(string Id, string NomeFantasia, string RazaoSocial, string Documento,
    string? Cidade, string? Uf, bool Ativo);

// Repository aplica funcionario_loja no SQL e nunca aceita empresa fornecida pelo navegador.
public sealed class OperationalContextRepository
{
    // A identidade parte do sub e resolve empresa/funcionário em uma única consulta parametrizada.
    public Task<OperationalIdentityRow?> FindIdentityAsync(MySqlConnection connection, string userId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<OperationalIdentityRow>(new CommandDefinition("""
            SELECT CAST(u.id_usuario AS CHAR(36)) UserId,COALESCE(f.nome,u.user_name) UserName,u.email Email,
                   CAST(f.id_funcionario AS CHAR(36)) EmployeeId,f.nome EmployeeName,
                   CAST(e.id_empresa AS CHAR(36)) CompanyId,e.nome CompanyName,e.ativo CompanyActive
            FROM usuarios u INNER JOIN funcionario f ON f.id_usuario=u.id_usuario
            INNER JOIN empresa e ON e.id_empresa=f.id_empresa WHERE u.id_usuario=@UserId LIMIT 1
            """, new { UserId = userId }, cancellationToken: token));

    // Lista inclui loja inativa vinculada para que a interface explique o estado sem torná-la selecionável.
    public async Task<IReadOnlyList<OperationalStoreRow>> ListStoresAsync(MySqlConnection connection, string employeeId, string companyId, CancellationToken token) =>
        (await connection.QueryAsync<OperationalStoreRow>(new CommandDefinition("""
            SELECT CAST(l.id_loja AS CHAR(36)) Id,l.nome_fantasia NomeFantasia,l.razao_social RazaoSocial,
                   l.documento Documento,l.cidade Cidade,l.uf Uf,l.ativo Ativo
            FROM funcionario_loja fl INNER JOIN loja l ON l.id_loja=fl.id_loja AND l.id_empresa=fl.id_empresa
            WHERE fl.id_funcionario=@EmployeeId AND fl.id_empresa=@CompanyId
            ORDER BY l.nome_fantasia,l.id_loja
            """, new { EmployeeId = employeeId, CompanyId = companyId }, cancellationToken: token))).AsList();

    // Resolver exige simultaneamente empresa, funcionário e vínculo, evitando confiar apenas no UUID do header.
    public Task<OperationalStoreRow?> FindLinkedStoreAsync(MySqlConnection connection, string employeeId, string companyId, string storeId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<OperationalStoreRow>(new CommandDefinition("""
            SELECT CAST(l.id_loja AS CHAR(36)) Id,l.nome_fantasia NomeFantasia,l.razao_social RazaoSocial,
                   l.documento Documento,l.cidade Cidade,l.uf Uf,l.ativo Ativo
            FROM funcionario_loja fl INNER JOIN loja l ON l.id_loja=fl.id_loja AND l.id_empresa=fl.id_empresa
            WHERE fl.id_funcionario=@EmployeeId AND fl.id_empresa=@CompanyId
              AND l.id_empresa=@CompanyId AND l.id_loja=@StoreId LIMIT 1
            """, new { EmployeeId = employeeId, CompanyId = companyId, StoreId = storeId }, cancellationToken: token));
}
