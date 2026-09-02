using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

public sealed record AuthenticationUser(string Id, string Name, string Email, bool Active, string PasswordHash);
public sealed record AuthenticationSession(string Id, string UserId, DateTime CreatedAtUtc, DateTime LastUsedAtUtc, DateTime AbsoluteExpiresAtUtc, DateTime? RevokedAtUtc, string? UserAgent);
public sealed record RefreshTokenRecord(string Id, string SessionId, string TokenHash, string FamilyId, DateTime ExpiresAtUtc, DateTime? UsedAtUtc, DateTime? RevokedAtUtc);

public sealed class AuthenticationRepository
{
    private const string UserSelect = "SELECT CAST(u.id_usuario AS CHAR(36)) AS Id,COALESCE(f.nome,u.user_name) Name,u.email Email,u.ativo Active,u.password_hash PasswordHash FROM usuarios u LEFT JOIN funcionario f ON f.id_usuario=u.id_usuario";

    public async Task<AuthenticationUser?> FindUserByEmailAsync(MySqlConnection connection, MySqlTransaction transaction, string email, CancellationToken token) =>
        await connection.QuerySingleOrDefaultAsync<AuthenticationUser>(new CommandDefinition(
            $"{UserSelect} WHERE u.email=@Email LIMIT 1 FOR UPDATE", new { Email = email }, transaction, cancellationToken: token));

    public async Task<AuthenticationUser?> FindUserByIdAsync(MySqlConnection connection, MySqlTransaction? transaction, string userId, CancellationToken token) =>
        await connection.QuerySingleOrDefaultAsync<AuthenticationUser>(new CommandDefinition(
            $"{UserSelect} WHERE u.id_usuario=@UserId LIMIT 1", new { UserId = userId }, transaction, cancellationToken: token));

    public async Task<int> CountRecentFailuresAsync(MySqlConnection connection, MySqlTransaction transaction, string emailHash, DateTime sinceUtc, CancellationToken token) =>
        await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM tentativa_login WHERE email_hash=@EmailHash AND sucesso=0 AND data_cadastro>=@SinceUtc AND data_cadastro>COALESCE((SELECT MAX(data_cadastro) FROM tentativa_login WHERE email_hash=@EmailHash AND sucesso=1),'1970-01-01')",
            new { EmailHash = emailHash, SinceUtc = sinceUtc }, transaction, cancellationToken: token));

    public async Task<DateTime?> LatestFailureAsync(MySqlConnection connection, MySqlTransaction transaction, string emailHash, CancellationToken token) =>
        await connection.ExecuteScalarAsync<DateTime?>(new CommandDefinition(
            "SELECT MAX(data_cadastro) FROM tentativa_login WHERE email_hash=@EmailHash AND sucesso=0 AND data_cadastro>COALESCE((SELECT MAX(data_cadastro) FROM tentativa_login WHERE email_hash=@EmailHash AND sucesso=1),'1970-01-01')",
            new { EmailHash = emailHash }, transaction, cancellationToken: token));

    public Task InsertLoginAttemptAsync(MySqlConnection connection, MySqlTransaction transaction, string emailHash, string? userId, bool success, string reason, string? ip, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO tentativa_login (id_tentativa,email_hash,id_usuario,sucesso,motivo,ip_address,data_cadastro) VALUES (@Id,@EmailHash,@UserId,@Success,@Reason,@Ip,@Now)",
            new { Id = Guid.NewGuid().ToString(), EmailHash = emailHash, UserId = userId, Success = success, Reason = reason, Ip = ip, Now = now }, transaction, cancellationToken: token));

    public Task CreateSessionAsync(MySqlConnection connection, MySqlTransaction transaction, string id, string userId, DateTime now, DateTime expires, string? ip, string? agent, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO sessao_usuario (id_sessao,id_usuario,criada_em,ultimo_uso_em,expira_em,ip_inicial,user_agent,atualizada_em) VALUES (@Id,@UserId,@Now,@Now,@Expires,@Ip,@Agent,@Now)",
            new { Id = id, UserId = userId, Now = now, Expires = expires, Ip = ip, Agent = agent }, transaction, cancellationToken: token));

    public Task CreateRefreshTokenAsync(MySqlConnection connection, MySqlTransaction transaction, string id, string sessionId, string hash, string familyId, string? previousId, DateTime now, DateTime expires, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO token_refresh (id_token,id_sessao,token_hash,id_familia,id_token_anterior,criado_em,expira_em,atualizado_em) VALUES (@Id,@SessionId,@Hash,@FamilyId,@PreviousId,@Now,@Expires,@Now)",
            new { Id = id, SessionId = sessionId, Hash = hash, FamilyId = familyId, PreviousId = previousId, Now = now, Expires = expires }, transaction, cancellationToken: token));

    public async Task<RefreshTokenRecord?> FindRefreshForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string hash, CancellationToken token)
    {
        await using var command = connection.CreateCommand(); command.Transaction = transaction;
        command.CommandText = "SELECT CAST(id_token AS CHAR(36)) AS Id,CAST(id_sessao AS CHAR(36)) AS SessionId,token_hash TokenHash,CAST(id_familia AS CHAR(36)) AS FamilyId,expira_em ExpiresAtUtc,usado_em UsedAtUtc,revogado_em RevokedAtUtc FROM token_refresh WHERE token_hash=@Hash LIMIT 1 FOR UPDATE";
        command.Parameters.AddWithValue("@Hash", hash);
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return new(ReadIdentifier(reader, 0), ReadIdentifier(reader, 1), reader.GetString(2), ReadIdentifier(reader, 3), reader.GetDateTime(4), reader.IsDBNull(5) ? null : reader.GetDateTime(5), reader.IsDBNull(6) ? null : reader.GetDateTime(6));
    }

    public async Task<AuthenticationSession?> FindSessionForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string sessionId, CancellationToken token)
    {
        await using var command = connection.CreateCommand(); command.Transaction = transaction;
        command.CommandText = "SELECT CAST(id_sessao AS CHAR(36)) AS Id,CAST(id_usuario AS CHAR(36)) AS UserId,criada_em CreatedAtUtc,ultimo_uso_em LastUsedAtUtc,expira_em AbsoluteExpiresAtUtc,revogada_em RevokedAtUtc,user_agent UserAgent FROM sessao_usuario WHERE id_sessao=@SessionId LIMIT 1 FOR UPDATE";
        command.Parameters.AddWithValue("@SessionId", sessionId);
        await using var reader = await command.ExecuteReaderAsync(token);
        return await reader.ReadAsync(token) ? ReadSession(reader) : null;
    }

    public async Task<bool> IsSessionActiveAsync(MySqlConnection connection, string sessionId, string userId, DateTime now, CancellationToken token) =>
        await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM sessao_usuario s JOIN usuarios u ON u.id_usuario=s.id_usuario WHERE s.id_sessao=@SessionId AND s.id_usuario=@UserId AND s.revogada_em IS NULL AND s.expira_em>@Now AND u.ativo=1",
            new { SessionId = sessionId, UserId = userId, Now = now }, cancellationToken: token)) == 1;

    // Rows affected é o claim atômico: somente quem obtém 1 pode inserir o sucessor; 0 indica que outra requisição venceu.
    public Task<int> MarkRefreshUsedAsync(MySqlConnection connection, MySqlTransaction transaction, string tokenId, string successorId, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE token_refresh SET usado_em=@Now,id_token_substituto=@SuccessorId,atualizado_em=@Now WHERE id_token=@TokenId AND usado_em IS NULL", new { TokenId = tokenId, SuccessorId = successorId, Now = now }, transaction, cancellationToken: token));

    public Task TouchSessionAsync(MySqlConnection connection, MySqlTransaction transaction, string sessionId, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE sessao_usuario SET ultimo_uso_em=@Now,atualizada_em=@Now WHERE id_sessao=@SessionId", new { SessionId = sessionId, Now = now }, transaction, cancellationToken: token));

    public Task RevokeSessionAsync(MySqlConnection connection, MySqlTransaction transaction, string sessionId, string reason, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE sessao_usuario SET revogada_em=COALESCE(revogada_em,@Now),motivo_revogacao=COALESCE(motivo_revogacao,@Reason),atualizada_em=@Now WHERE id_sessao=@SessionId; UPDATE token_refresh SET revogado_em=COALESCE(revogado_em,@Now),motivo_revogacao=COALESCE(motivo_revogacao,@Reason),atualizado_em=@Now WHERE id_sessao=@SessionId AND revogado_em IS NULL", new { SessionId = sessionId, Reason = reason, Now = now }, transaction, cancellationToken: token));

    public Task RevokeFamilyAsync(MySqlConnection connection, MySqlTransaction transaction, string familyId, string reason, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE token_refresh SET revogado_em=COALESCE(revogado_em,@Now),motivo_revogacao=COALESCE(motivo_revogacao,@Reason),atualizado_em=@Now WHERE id_familia=@FamilyId", new { FamilyId = familyId, Reason = reason, Now = now }, transaction, cancellationToken: token));

    public Task RevokeAllAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, string reason, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE sessao_usuario SET revogada_em=COALESCE(revogada_em,@Now),motivo_revogacao=COALESCE(motivo_revogacao,@Reason),atualizada_em=@Now WHERE id_usuario=@UserId; UPDATE token_refresh r JOIN sessao_usuario s ON s.id_sessao=r.id_sessao SET r.revogado_em=COALESCE(r.revogado_em,@Now),r.motivo_revogacao=COALESCE(r.motivo_revogacao,@Reason),r.atualizado_em=@Now WHERE s.id_usuario=@UserId", new { UserId = userId, Reason = reason, Now = now }, transaction, cancellationToken: token));

    public Task InsertSecurityEventAsync(MySqlConnection connection, MySqlTransaction transaction, string? userId, string? sessionId, string type, string result, string? ip, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("INSERT INTO evento_seguranca (id_evento,id_usuario,id_sessao,tipo_evento,resultado,ip_address,data_cadastro) VALUES (@Id,@UserId,@SessionId,@Type,@Result,@Ip,@Now)", new { Id = Guid.NewGuid().ToString(), UserId = userId, SessionId = sessionId, Type = type, Result = result, Ip = ip, Now = now }, transaction, cancellationToken: token));

    public async Task<IReadOnlyList<AuthenticationSession>> ListSessionsAsync(MySqlConnection connection, string userId, CancellationToken token)
    {
        await using var command = connection.CreateCommand(); command.CommandText = "SELECT CAST(id_sessao AS CHAR(36)) AS Id,CAST(id_usuario AS CHAR(36)) AS UserId,criada_em CreatedAtUtc,ultimo_uso_em LastUsedAtUtc,expira_em AbsoluteExpiresAtUtc,revogada_em RevokedAtUtc,user_agent UserAgent FROM sessao_usuario WHERE id_usuario=@UserId ORDER BY criada_em DESC";
        command.Parameters.AddWithValue("@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync(token); var result = new List<AuthenticationSession>();
        while (await reader.ReadAsync(token)) result.Add(ReadSession(reader));
        return result;
    }

    private static AuthenticationSession ReadSession(MySqlDataReader reader) => new(ReadIdentifier(reader, 0), ReadIdentifier(reader, 1), reader.GetDateTime(2), reader.GetDateTime(3), reader.GetDateTime(4), reader.IsDBNull(5) ? null : reader.GetDateTime(5), reader.IsDBNull(6) ? null : reader.GetString(6));

    private static string ReadIdentifier(MySqlDataReader reader, int ordinal) => reader.GetValue(ordinal) switch
    {
        Guid value => value.ToString(),
        string value => value,
        var value => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture)
            ?? throw new InvalidOperationException("Database identifier cannot be null.")
    };
}
