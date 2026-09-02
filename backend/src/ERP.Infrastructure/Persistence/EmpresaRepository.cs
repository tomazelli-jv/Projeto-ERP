using Dapper;
using ERP.Infrastructure.Application;
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

    // O predicado inclui contexto e id da rota; rows affected permite ao service reavaliar ausência ou concorrência.
    public Task<int> UpdateEmpresaAsync(MySqlConnection connection, string contextEmpresaId, string requestedEmpresaId, string nome, bool ativo, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "UPDATE empresa SET nome=@Nome,ativo=@Ativo WHERE id_empresa=@RequestedEmpresaId AND id_empresa=@ContextEmpresaId",
            new { Nome = nome, Ativo = ativo, RequestedEmpresaId = requestedEmpresaId, ContextEmpresaId = contextEmpresaId }, cancellationToken: token));

    // Insere a loja na transação fornecida pelo service; repository não decide commit nem rollback.
    public Task<int> CreateLojaAsync(MySqlConnection connection, MySqlTransaction transaction, string lojaId, string empresaId, LojaWrite loja, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,telefone,email,cep,rua,numero,complemento,bairro,cidade,uf,ativo) VALUES (@LojaId,@EmpresaId,@RazaoSocial,@NomeFantasia,@Documento,@Telefone,@Email,@Cep,@Rua,@Numero,@Complemento,@Bairro,@Cidade,@Uf,@Ativo)",
            new { LojaId = lojaId, EmpresaId = empresaId, loja.RazaoSocial, loja.NomeFantasia, loja.Documento, loja.Telefone, loja.Email, loja.Cep, loja.Rua, loja.Numero, loja.Complemento, loja.Bairro, loja.Cidade, loja.Uf, loja.Ativo },
            transaction, cancellationToken: token));

    // Cria somente o vínculo do funcionário autor para tornar a nova loja imediatamente acessível após o commit.
    public Task<int> CreateFuncionarioLojaAsync(MySqlConnection connection, MySqlTransaction transaction, string linkId, BusinessContextRecord context, string lojaId, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@LinkId,@FuncionarioId,@LojaId,@EmpresaId)",
            new { LinkId = linkId, context.FuncionarioId, LojaId = lojaId, EmpresaId = context.EmpresaId }, transaction, cancellationToken: token));

    // O UPDATE JOIN exige vínculo explícito e mesma empresa, impedindo escrita por um id_loja obtido externamente.
    public Task<int> UpdateLojaAsync(MySqlConnection connection, BusinessContextRecord context, string lojaId, LojaWrite loja, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "UPDATE loja l INNER JOIN funcionario_loja fl ON fl.id_loja=l.id_loja AND fl.id_empresa=l.id_empresa SET l.razao_social=@RazaoSocial,l.nome_fantasia=@NomeFantasia,l.documento=@Documento,l.telefone=@Telefone,l.email=@Email,l.cep=@Cep,l.rua=@Rua,l.numero=@Numero,l.complemento=@Complemento,l.bairro=@Bairro,l.cidade=@Cidade,l.uf=@Uf,l.ativo=@Ativo WHERE l.id_loja=@LojaId AND l.id_empresa=@EmpresaId AND fl.id_funcionario=@FuncionarioId AND fl.id_empresa=@EmpresaId",
            new { LojaId = lojaId, EmpresaId = context.EmpresaId, context.FuncionarioId, loja.RazaoSocial, loja.NomeFantasia, loja.Documento, loja.Telefone, loja.Email, loja.Cep, loja.Rua, loja.Numero, loja.Complemento, loja.Bairro, loja.Cidade, loja.Uf, loja.Ativo },
            cancellationToken: token));
}
