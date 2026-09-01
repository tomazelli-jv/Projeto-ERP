using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

// Modelos internos preservam a separação entre linhas de persistência e contratos expostos pela API.
public sealed record BusinessContextRecord(string FuncionarioId, string EmpresaId);
public sealed record EmpresaRecord(string Id, string Nome, bool Ativo, DateTime DataCadastro);
public sealed record LojaRecord(
    string Id,
    string IdEmpresa,
    string RazaoSocial,
    string NomeFantasia,
    string Documento,
    string? Telefone,
    string? Email,
    string? Cep,
    string? Rua,
    string? Numero,
    string? Complemento,
    string? Bairro,
    string? Cidade,
    string? Uf,
    bool Ativo,
    DateTime DataCadastro);

// Executa somente consultas parametrizadas e aplica o vínculo funcionário/empresa/loja no próprio SQL.
public sealed class EmpresaRepository
{
    private const string LojaColumns = "CAST(l.id_loja AS CHAR(36)) Id,CAST(l.id_empresa AS CHAR(36)) IdEmpresa,l.razao_social RazaoSocial,l.nome_fantasia NomeFantasia,l.documento Documento,l.telefone Telefone,l.email Email,l.cep Cep,l.rua Rua,l.numero Numero,l.complemento Complemento,l.bairro Bairro,l.cidade Cidade,l.uf Uf,l.ativo Ativo,l.data_cadastro DataCadastro";

    // Resolve o único funcionário ligado ao claim sub; ausência de linha significa falta de contexto empresarial.
    public Task<BusinessContextRecord?> FindContextAsync(MySqlConnection connection, string userId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<BusinessContextRecord>(new CommandDefinition(
            "SELECT CAST(f.id_funcionario AS CHAR(36)) FuncionarioId,CAST(f.id_empresa AS CHAR(36)) EmpresaId FROM funcionario f WHERE f.id_usuario=@UserId LIMIT 1",
            new { UserId = userId }, cancellationToken: token));

    // A igualdade dupla impede que um id informado na URL ultrapasse a empresa resolvida pelo usuário autenticado.
    public Task<EmpresaRecord?> FindEmpresaAsync(MySqlConnection connection, string contextEmpresaId, string requestedEmpresaId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<EmpresaRecord>(new CommandDefinition(
            "SELECT CAST(e.id_empresa AS CHAR(36)) Id,e.nome Nome,e.ativo Ativo,e.data_cadastro DataCadastro FROM empresa e WHERE e.id_empresa=@RequestedEmpresaId AND e.id_empresa=@ContextEmpresaId LIMIT 1",
            new { RequestedEmpresaId = requestedEmpresaId, ContextEmpresaId = contextEmpresaId }, cancellationToken: token));

    // A coleção é intencionalmente limitada à empresa do funcionário, nunca a todas as empresas do banco.
    public async Task<IReadOnlyList<EmpresaRecord>> ListEmpresasAsync(MySqlConnection connection, string contextEmpresaId, CancellationToken token) =>
        (await connection.QueryAsync<EmpresaRecord>(new CommandDefinition(
            "SELECT CAST(e.id_empresa AS CHAR(36)) Id,e.nome Nome,e.ativo Ativo,e.data_cadastro DataCadastro FROM empresa e WHERE e.id_empresa=@ContextEmpresaId",
            new { ContextEmpresaId = contextEmpresaId }, cancellationToken: token))).AsList();

    // Exige simultaneamente funcionário, empresa e vínculo de loja, protegendo também contra relações inconsistentes.
    public async Task<IReadOnlyList<LojaRecord>> ListLojasAsync(MySqlConnection connection, BusinessContextRecord context, string requestedEmpresaId, CancellationToken token) =>
        (await connection.QueryAsync<LojaRecord>(new CommandDefinition(
            $"SELECT {LojaColumns} FROM funcionario_loja fl INNER JOIN loja l ON l.id_loja=fl.id_loja AND l.id_empresa=fl.id_empresa WHERE fl.id_funcionario=@FuncionarioId AND fl.id_empresa=@ContextEmpresaId AND l.id_empresa=@RequestedEmpresaId ORDER BY l.nome_fantasia,l.id_loja",
            new { context.FuncionarioId, ContextEmpresaId = context.EmpresaId, RequestedEmpresaId = requestedEmpresaId }, cancellationToken: token))).AsList();

    // Busca uma loja somente quando o funcionário possui vínculo explícito e pertence à mesma empresa da loja.
    public Task<LojaRecord?> FindLojaAsync(MySqlConnection connection, BusinessContextRecord context, string lojaId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<LojaRecord>(new CommandDefinition(
            $"SELECT {LojaColumns} FROM funcionario_loja fl INNER JOIN loja l ON l.id_loja=fl.id_loja AND l.id_empresa=fl.id_empresa WHERE fl.id_funcionario=@FuncionarioId AND fl.id_empresa=@ContextEmpresaId AND l.id_empresa=@ContextEmpresaId AND l.id_loja=@LojaId LIMIT 1",
            new { context.FuncionarioId, ContextEmpresaId = context.EmpresaId, LojaId = lojaId }, cancellationToken: token));
}
