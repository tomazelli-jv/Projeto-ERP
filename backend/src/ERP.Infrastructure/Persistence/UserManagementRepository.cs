using Dapper;
using ERP.Application.Contracts;
using ERP.Application.Authorization;
using ERP.Infrastructure.Application;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

// Repository mantém SQL explícito, parametrizado e sempre recebe a conexão/transação coordenada pelo service.
public sealed class UserManagementRepository
{
    private const string UserDetailSql = """
        SELECT CAST(u.id_usuario AS CHAR(36)) IdUsuario,u.user_name UserName,u.email Email,u.ativo Ativo,u.data_cadastro DataCadastro,
               CAST(f.id_funcionario AS CHAR(36)) IdFuncionario,CAST(f.id_empresa AS CHAR(36)) EmpresaId,f.nome NomeFuncionario,
               (SELECT CAST(p.id_perfil AS CHAR(36)) FROM usuario_perfis up INNER JOIN perfis p ON p.id_perfil=up.id_perfil WHERE up.id_usuario=u.id_usuario AND p.nome_normalizado='ADMINISTRADOR' LIMIT 1) IdPerfil,
               (SELECT p.nome FROM usuario_perfis up INNER JOIN perfis p ON p.id_perfil=up.id_perfil WHERE up.id_usuario=u.id_usuario AND p.nome_normalizado='ADMINISTRADOR' LIMIT 1) PerfilNome
        FROM funcionario f INNER JOIN usuarios u ON u.id_usuario=f.id_usuario
        WHERE f.id_empresa=@EmpresaId
        """;

    // Contexto do administrador é derivado exclusivamente do sub autenticado, nunca de entrada do cliente.
    public Task<BusinessContextRecord?> FindContextAsync(MySqlConnection connection, MySqlTransaction? transaction, string userId, bool forUpdate, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<BusinessContextRecord>(new CommandDefinition(
            $"SELECT CAST(id_funcionario AS CHAR(36)) FuncionarioId,CAST(id_empresa AS CHAR(36)) EmpresaId FROM funcionario WHERE id_usuario=@UserId LIMIT 1{(forUpdate ? " FOR UPDATE" : "")}",
            new { UserId = userId }, transaction, cancellationToken: token));

    // Lista usuários somente por funcionario da empresa e agrega lojas sem retornar password_hash.
    public async Task<IReadOnlyList<ManagedUserListItem>> ListUsersAsync(MySqlConnection connection, string empresaId, CancellationToken token) =>
        (await connection.QueryAsync<ManagedUserListItem>(new CommandDefinition("""
            SELECT CAST(u.id_usuario AS CHAR(36)) IdUsuario,u.user_name UserName,u.email Email,u.ativo Ativo,u.data_cadastro DataCadastro,
                   CAST(f.id_funcionario AS CHAR(36)) IdFuncionario,f.nome NomeFuncionario,MAX(p.nome) Perfil,COUNT(DISTINCT fl.id_loja) QuantidadeLojas
            FROM funcionario f INNER JOIN usuarios u ON u.id_usuario=f.id_usuario
            LEFT JOIN usuario_perfis up ON up.id_usuario=u.id_usuario LEFT JOIN perfis p ON p.id_perfil=up.id_perfil AND p.nome_normalizado='ADMINISTRADOR'
            LEFT JOIN funcionario_loja fl ON fl.id_funcionario=f.id_funcionario AND fl.id_empresa=f.id_empresa
            WHERE f.id_empresa=@EmpresaId GROUP BY u.id_usuario,u.user_name,u.email,u.ativo,u.data_cadastro,f.id_funcionario,f.nome
            ORDER BY f.nome,u.id_usuario
            """, new { EmpresaId = empresaId }, cancellationToken: token))).AsList();

    // Detalhe usa o mesmo filtro empresarial para tornar IDs externos indistinguíveis de inexistentes.
    public Task<UserDetailRow?> FindUserAsync(MySqlConnection connection, MySqlTransaction? transaction, string empresaId, string userId, bool forUpdate, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<UserDetailRow>(new CommandDefinition(
            $"{UserDetailSql} AND u.id_usuario=@UserId LIMIT 1{(forUpdate ? " FOR UPDATE" : "")}",
            new { EmpresaId = empresaId, UserId = userId }, transaction, cancellationToken: token));

    // LEFT JOIN inclui funcionários sem credencial, preservando a distinção conceitual do domínio.
    public async Task<IReadOnlyList<ManagedEmployeeSummary>> ListEmployeesAsync(MySqlConnection connection, string empresaId, CancellationToken token) =>
        (await connection.QueryAsync<EmployeeSummaryRow>(new CommandDefinition("""
            SELECT CAST(f.id_funcionario AS CHAR(36)) IdFuncionario,f.nome Nome,(u.id_usuario IS NOT NULL) PossuiUsuario,
                   CAST(u.id_usuario AS CHAR(36)) IdUsuario,u.user_name UserName,u.email Email,COUNT(DISTINCT fl.id_loja) QuantidadeLojas
            FROM funcionario f LEFT JOIN usuarios u ON u.id_usuario=f.id_usuario
            LEFT JOIN funcionario_loja fl ON fl.id_funcionario=f.id_funcionario AND fl.id_empresa=f.id_empresa
            WHERE f.id_empresa=@EmpresaId GROUP BY f.id_funcionario,f.nome,u.id_usuario,u.user_name,u.email ORDER BY f.nome,f.id_funcionario
            """, new { EmpresaId = empresaId }, cancellationToken: token)))
            .Select(row => new ManagedEmployeeSummary(row.IdFuncionario, row.Nome, row.PossuiUsuario != 0,
                row.IdUsuario, row.UserName, row.Email, row.QuantidadeLojas)).ToArray();

    public Task<EmployeeRow?> FindEmployeeAsync(MySqlConnection connection, MySqlTransaction? transaction, string empresaId, string employeeId, bool forUpdate, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<EmployeeRow>(new CommandDefinition(
            $"SELECT CAST(f.id_funcionario AS CHAR(36)) IdFuncionario,f.nome Nome,CAST(f.id_usuario AS CHAR(36)) IdUsuario FROM funcionario f WHERE f.id_empresa=@EmpresaId AND f.id_funcionario=@EmployeeId LIMIT 1{(forUpdate ? " FOR UPDATE" : "")}",
            new { EmpresaId = empresaId, EmployeeId = employeeId }, transaction, cancellationToken: token));

    // Somente o perfil oficial atual é atribuível; perfis desconhecidos permanecem intocados e invisíveis nesta fase.
    public async Task<IReadOnlyList<ManagedProfile>> ListProfilesAsync(MySqlConnection connection, CancellationToken token) =>
        (await connection.QueryAsync<ManagedProfile>(new CommandDefinition(
            "SELECT CAST(id_perfil AS CHAR(36)) IdPerfil,nome Nome FROM perfis WHERE nome_normalizado=@Name ORDER BY nome",
            new { Name = InitialProfiles.AdministratorNormalizedName }, cancellationToken: token))).AsList();

    public Task<ManagedProfile?> FindOfficialProfileAsync(MySqlConnection connection, MySqlTransaction transaction, string profileId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<ManagedProfile>(new CommandDefinition(
            "SELECT CAST(id_perfil AS CHAR(36)) IdPerfil,nome Nome FROM perfis WHERE id_perfil=@ProfileId AND nome_normalizado=@Name LIMIT 1 FOR UPDATE",
            new { ProfileId = profileId, Name = InitialProfiles.AdministratorNormalizedName }, transaction, cancellationToken: token));

    // A administração de acessos precisa ver todas as lojas da própria empresa, inclusive inativas já vinculadas.
    public async Task<IReadOnlyList<ManagedStore>> ListBusinessStoresAsync(MySqlConnection connection, string empresaId, CancellationToken token) =>
        (await connection.QueryAsync<ManagedStore>(new CommandDefinition(
            "SELECT CAST(id_loja AS CHAR(36)) IdLoja,nome_fantasia NomeFantasia,ativo Ativo FROM loja WHERE id_empresa=@EmpresaId ORDER BY nome_fantasia,id_loja",
            new { EmpresaId = empresaId }, cancellationToken: token))).AsList();

    public async Task<IReadOnlyList<ManagedStore>> ListEmployeeStoresAsync(MySqlConnection connection, string empresaId, string employeeId, CancellationToken token) =>
        (await connection.QueryAsync<ManagedStore>(new CommandDefinition(
            "SELECT CAST(l.id_loja AS CHAR(36)) IdLoja,l.nome_fantasia NomeFantasia,l.ativo Ativo FROM funcionario_loja fl INNER JOIN loja l ON l.id_loja=fl.id_loja AND l.id_empresa=fl.id_empresa WHERE fl.id_empresa=@EmpresaId AND fl.id_funcionario=@EmployeeId ORDER BY l.nome_fantasia,l.id_loja",
            new { EmpresaId = empresaId, EmployeeId = employeeId }, cancellationToken: token))).AsList();

    // Validação em lote exige que todos os IDs pertençam à empresa e bloqueia novas atribuições de lojas inativas.
    public async Task<int> CountAssignableStoresAsync(MySqlConnection connection, MySqlTransaction transaction, string empresaId, string? employeeId, IReadOnlyList<string> ids, CancellationToken token)
    {
        if (ids.Count == 0) return 0;
        // Linhas são realmente materializadas com FOR UPDATE; vínculo prévio permite preservar uma loja que ficou inativa.
        var locked = await connection.QueryAsync<string>(new CommandDefinition("""
            SELECT CAST(l.id_loja AS CHAR(36)) FROM loja l
            WHERE l.id_empresa=@EmpresaId AND l.id_loja IN @Ids
              AND (l.ativo=1 OR (@EmployeeId IS NOT NULL AND EXISTS(
                  SELECT 1 FROM funcionario_loja fl WHERE fl.id_funcionario=@EmployeeId AND fl.id_loja=l.id_loja AND fl.id_empresa=l.id_empresa)))
            FOR UPDATE
            """, new { EmpresaId = empresaId, EmployeeId = employeeId, Ids = ids }, transaction, cancellationToken: token));
        return locked.Count();
    }

    public Task<int> InsertUserAsync(MySqlConnection connection, MySqlTransaction transaction, string id, UserCreation input, string hash, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,@Active)",
            new { Id = id, input.UserName, Hash = hash, input.Email, input.Active }, transaction, cancellationToken: token));

    public Task<int> InsertEmployeeAsync(MySqlConnection connection, MySqlTransaction transaction, string id, string userId, string empresaId, string name, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@EmpresaId,@Name)",
            new { Id = id, UserId = userId, EmpresaId = empresaId, Name = name }, transaction, cancellationToken: token));

    public Task<int> UpdateUserAsync(MySqlConnection connection, MySqlTransaction transaction, string id, UserUpdate input, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE usuarios SET user_name=@UserName,email=@Email,ativo=@Active WHERE id_usuario=@Id",
            new { Id = id, input.UserName, input.Email, input.Active }, transaction, cancellationToken: token));

    public Task<int> UpdateEmployeeAsync(MySqlConnection connection, MySqlTransaction? transaction, string id, string empresaId, string name, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE funcionario SET nome=@Name WHERE id_funcionario=@Id AND id_empresa=@EmpresaId",
            new { Id = id, EmpresaId = empresaId, Name = name }, transaction, cancellationToken: token));

    // Substituição remove somente o perfil oficial gerenciável e preserva vínculos futuros/desconhecidos.
    public async Task ReplaceOfficialProfileAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, string profileId, CancellationToken token)
    {
        await connection.ExecuteAsync(new CommandDefinition(
            "DELETE up FROM usuario_perfis up INNER JOIN perfis p ON p.id_perfil=up.id_perfil WHERE up.id_usuario=@UserId AND p.nome_normalizado=@Name",
            new { UserId = userId, Name = InitialProfiles.AdministratorNormalizedName }, transaction, cancellationToken: token));
        await connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UserId,@ProfileId)", new { UserId = userId, ProfileId = profileId }, transaction, cancellationToken: token));
    }

    // Substituição completa preserva vínculos presentes, remove ausentes e cria UUID somente para novos pares.
    public async Task ReplaceStoresAsync(MySqlConnection connection, MySqlTransaction transaction, string employeeId, string empresaId, IReadOnlyList<string> ids, CancellationToken token)
    {
        await connection.ExecuteAsync(new CommandDefinition(
            ids.Count == 0
                ? "DELETE FROM funcionario_loja WHERE id_funcionario=@EmployeeId AND id_empresa=@EmpresaId"
                : "DELETE FROM funcionario_loja WHERE id_funcionario=@EmployeeId AND id_empresa=@EmpresaId AND id_loja NOT IN @Ids",
            new { EmployeeId = employeeId, EmpresaId = empresaId, Ids = ids }, transaction, cancellationToken: token));
        foreach (var storeId in ids)
            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Id,@EmployeeId,@StoreId,@EmpresaId) ON DUPLICATE KEY UPDATE id_funcionario_loja=id_funcionario_loja",
                new { Id = Guid.NewGuid().ToString(), EmployeeId = employeeId, StoreId = storeId, EmpresaId = empresaId }, transaction, cancellationToken: token));
    }

    // Contagem bloqueada protege contra duas inativações concorrentes do último Administrador da empresa.
    public async Task<int> CountOtherActiveAdministratorsAsync(MySqlConnection connection, MySqlTransaction transaction, string empresaId, string excludedUserId, CancellationToken token)
    {
        // Materializar e bloquear as identidades impede que duas transações aprovem simultaneamente a remoção do último administrador.
        var locked = await connection.QueryAsync<string>(new CommandDefinition("""
            SELECT CAST(u.id_usuario AS CHAR(36)) FROM funcionario f INNER JOIN usuarios u ON u.id_usuario=f.id_usuario
            INNER JOIN usuario_perfis up ON up.id_usuario=u.id_usuario INNER JOIN perfis p ON p.id_perfil=up.id_perfil
            WHERE f.id_empresa=@EmpresaId AND u.ativo=1 AND u.id_usuario<>@ExcludedUserId AND p.nome_normalizado='ADMINISTRADOR' FOR UPDATE
            """, new { EmpresaId = empresaId, ExcludedUserId = excludedUserId }, transaction, cancellationToken: token));
        return locked.Count();
    }

    // Inativação revoga sessões e refresh tokens na mesma transação da alteração do usuário.
    public Task RevokeSessionsAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("""
            UPDATE sessao_usuario SET revogada_em=COALESCE(revogada_em,@Now),motivo_revogacao=COALESCE(motivo_revogacao,'user_deactivated'),atualizada_em=@Now WHERE id_usuario=@UserId;
            UPDATE token_refresh r INNER JOIN sessao_usuario s ON s.id_sessao=r.id_sessao SET r.revogado_em=COALESCE(r.revogado_em,@Now),r.motivo_revogacao=COALESCE(r.motivo_revogacao,'user_deactivated'),r.atualizado_em=@Now WHERE s.id_usuario=@UserId;
            """, new { UserId = userId, Now = now }, transaction, cancellationToken: token));
}

// Rows internos materializam somente colunas necessárias e mantêm UUID CHAR(36) como string.
public sealed record UserDetailRow(string IdUsuario, string UserName, string Email, bool Ativo, DateTime DataCadastro,
    string IdFuncionario, string EmpresaId, string NomeFuncionario, string? IdPerfil, string? PerfilNome);
public sealed record EmployeeRow(string IdFuncionario, string Nome, string? IdUsuario);
public sealed record EmployeeSummaryRow(string IdFuncionario, string Nome, int PossuiUsuario, string? IdUsuario,
    string? UserName, string? Email, long QuantidadeLojas);
