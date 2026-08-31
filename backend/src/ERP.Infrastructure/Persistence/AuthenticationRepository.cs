using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

public sealed record AuthenticationUser(string Id, string Name, string Email, string Status, string? PasswordHash);
public sealed record AuthenticationSession(string Id, string UserId, DateTime CreatedAtUtc, DateTime LastUsedAtUtc, DateTime AbsoluteExpiresAtUtc, DateTime? RevokedAtUtc, string? UserAgent);
public sealed record RefreshTokenRecord(string Id, string SessionId, string TokenHash, string FamilyId, DateTime ExpiresAtUtc, DateTime? UsedAtUtc, DateTime? RevokedAtUtc);

public sealed class AuthenticationRepository
{
    public async Task<AuthenticationUser?> FindUserByEmailAsync(MySqlConnection connection, MySqlTransaction transaction, string email, CancellationToken token) =>
        await connection.QuerySingleOrDefaultAsync<AuthenticationUser>(new CommandDefinition(
            "SELECT u.id Id,u.name Name,u.email Email,u.status Status,c.password_hash PasswordHash FROM users u LEFT JOIN user_credentials c ON c.user_id=u.id WHERE u.email=@Email LIMIT 1 FOR UPDATE",
            new { Email = email }, transaction, cancellationToken: token));

    public async Task<AuthenticationUser?> FindUserByIdAsync(MySqlConnection connection, MySqlTransaction? transaction, string userId, CancellationToken token) =>
        await connection.QuerySingleOrDefaultAsync<AuthenticationUser>(new CommandDefinition(
            "SELECT u.id Id,u.name Name,u.email Email,u.status Status,c.password_hash PasswordHash FROM users u LEFT JOIN user_credentials c ON c.user_id=u.id WHERE u.id=@UserId LIMIT 1",
            new { UserId = userId }, transaction, cancellationToken: token));

    public async Task<int> CountRecentFailuresAsync(MySqlConnection connection, MySqlTransaction transaction, string emailHash, DateTime sinceUtc, CancellationToken token) =>
        await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM login_attempts WHERE email_hash=@EmailHash AND succeeded=0 AND created_at>=@SinceUtc AND created_at>COALESCE((SELECT MAX(created_at) FROM login_attempts WHERE email_hash=@EmailHash AND succeeded=1),'1970-01-01')",
            new { EmailHash = emailHash, SinceUtc = sinceUtc }, transaction, cancellationToken: token));

    public async Task<DateTime?> LatestFailureAsync(MySqlConnection connection, MySqlTransaction transaction, string emailHash, CancellationToken token) =>
        await connection.ExecuteScalarAsync<DateTime?>(new CommandDefinition(
            "SELECT MAX(created_at) FROM login_attempts WHERE email_hash=@EmailHash AND succeeded=0 AND created_at>COALESCE((SELECT MAX(created_at) FROM login_attempts WHERE email_hash=@EmailHash AND succeeded=1),'1970-01-01')",
            new { EmailHash = emailHash }, transaction, cancellationToken: token));

    public Task InsertLoginAttemptAsync(MySqlConnection connection, MySqlTransaction transaction, string emailHash, string? userId, bool success, string reason, string? ip, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO login_attempts (id,email_hash,user_id,succeeded,reason,ip_address,created_at) VALUES (@Id,@EmailHash,@UserId,@Success,@Reason,@Ip,@Now)",
            new { Id = Guid.NewGuid().ToString(), EmailHash = emailHash, UserId = userId, Success = success, Reason = reason, Ip = ip, Now = now }, transaction, cancellationToken: token));

    public Task CreateSessionAsync(MySqlConnection connection, MySqlTransaction transaction, string id, string userId, DateTime now, DateTime expires, string? ip, string? agent, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO auth_sessions (id,user_id,created_at,last_used_at,absolute_expires_at,initial_ip,user_agent,updated_at) VALUES (@Id,@UserId,@Now,@Now,@Expires,@Ip,@Agent,@Now)",
            new { Id = id, UserId = userId, Now = now, Expires = expires, Ip = ip, Agent = agent }, transaction, cancellationToken: token));

    public Task CreateRefreshTokenAsync(MySqlConnection connection, MySqlTransaction transaction, string id, string sessionId, string hash, string familyId, string? previousId, DateTime now, DateTime expires, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO refresh_tokens (id,session_id,token_hash,family_id,previous_token_id,created_at,expires_at,updated_at) VALUES (@Id,@SessionId,@Hash,@FamilyId,@PreviousId,@Now,@Expires,@Now)",
            new { Id = id, SessionId = sessionId, Hash = hash, FamilyId = familyId, PreviousId = previousId, Now = now, Expires = expires }, transaction, cancellationToken: token));

    public async Task<RefreshTokenRecord?> FindRefreshForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string hash, CancellationToken token)
    {
        await using var command = connection.CreateCommand(); command.Transaction = transaction;
        command.CommandText = "SELECT id,session_id,token_hash,family_id,expires_at,used_at,revoked_at FROM refresh_tokens WHERE token_hash=@Hash LIMIT 1 FOR UPDATE";
        command.Parameters.AddWithValue("@Hash", hash);
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return new(ReadIdentifier(reader, 0), ReadIdentifier(reader, 1), reader.GetString(2), ReadIdentifier(reader, 3), reader.GetDateTime(4), reader.IsDBNull(5) ? null : reader.GetDateTime(5), reader.IsDBNull(6) ? null : reader.GetDateTime(6));
    }

    public async Task<AuthenticationSession?> FindSessionForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string sessionId, CancellationToken token)
    {
        await using var command = connection.CreateCommand(); command.Transaction = transaction;
        command.CommandText = "SELECT id,user_id,created_at,last_used_at,absolute_expires_at,revoked_at,user_agent FROM auth_sessions WHERE id=@SessionId LIMIT 1 FOR UPDATE";
        command.Parameters.AddWithValue("@SessionId", sessionId);
        await using var reader = await command.ExecuteReaderAsync(token);
        return await reader.ReadAsync(token) ? ReadSession(reader) : null;
    }

    public async Task<bool> IsSessionActiveAsync(MySqlConnection connection, string sessionId, string userId, DateTime now, CancellationToken token) =>
        await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=@SessionId AND s.user_id=@UserId AND s.revoked_at IS NULL AND s.absolute_expires_at>@Now AND u.status='active'",
            new { SessionId = sessionId, UserId = userId, Now = now }, cancellationToken: token)) == 1;

    public async Task<bool> HasActiveMembershipAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, CancellationToken token) =>
        await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM tenant_memberships WHERE user_id=@UserId AND status='active'",
            new { UserId = userId }, transaction, cancellationToken: token)) > 0;

    public Task MarkRefreshUsedAsync(MySqlConnection connection, MySqlTransaction transaction, string tokenId, string successorId, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE refresh_tokens SET used_at=@Now,replaced_by_token_id=@SuccessorId,updated_at=@Now WHERE id=@TokenId AND used_at IS NULL", new { TokenId = tokenId, SuccessorId = successorId, Now = now }, transaction, cancellationToken: token));

    public Task TouchSessionAsync(MySqlConnection connection, MySqlTransaction transaction, string sessionId, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE auth_sessions SET last_used_at=@Now,updated_at=@Now WHERE id=@SessionId", new { SessionId = sessionId, Now = now }, transaction, cancellationToken: token));

    public Task RevokeSessionAsync(MySqlConnection connection, MySqlTransaction transaction, string sessionId, string reason, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,@Now),revocation_reason=COALESCE(revocation_reason,@Reason),updated_at=@Now WHERE id=@SessionId; UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,@Now),revocation_reason=COALESCE(revocation_reason,@Reason),updated_at=@Now WHERE session_id=@SessionId AND revoked_at IS NULL", new { SessionId = sessionId, Reason = reason, Now = now }, transaction, cancellationToken: token));

    public Task RevokeFamilyAsync(MySqlConnection connection, MySqlTransaction transaction, string familyId, string reason, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,@Now),revocation_reason=COALESCE(revocation_reason,@Reason),updated_at=@Now WHERE family_id=@FamilyId", new { FamilyId = familyId, Reason = reason, Now = now }, transaction, cancellationToken: token));

    public Task RevokeAllAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, string reason, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,@Now),revocation_reason=COALESCE(revocation_reason,@Reason),updated_at=@Now WHERE user_id=@UserId; UPDATE refresh_tokens r JOIN auth_sessions s ON s.id=r.session_id SET r.revoked_at=COALESCE(r.revoked_at,@Now),r.revocation_reason=COALESCE(r.revocation_reason,@Reason),r.updated_at=@Now WHERE s.user_id=@UserId", new { UserId = userId, Reason = reason, Now = now }, transaction, cancellationToken: token));

    public Task UpdateLastLoginAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("UPDATE users SET last_login_at=@Now,updated_at=@Now WHERE id=@UserId", new { UserId = userId, Now = now }, transaction, cancellationToken: token));

    public Task InsertSecurityEventAsync(MySqlConnection connection, MySqlTransaction transaction, string? userId, string? sessionId, string type, string result, string? ip, DateTime now, CancellationToken token) =>
        connection.ExecuteAsync(new CommandDefinition("INSERT INTO security_events (id,user_id,session_id,event_type,result,ip_address,created_at) VALUES (@Id,@UserId,@SessionId,@Type,@Result,@Ip,@Now)", new { Id = Guid.NewGuid().ToString(), UserId = userId, SessionId = sessionId, Type = type, Result = result, Ip = ip, Now = now }, transaction, cancellationToken: token));

    public async Task<IReadOnlyList<AuthenticationSession>> ListSessionsAsync(MySqlConnection connection, string userId, CancellationToken token)
    {
        await using var command = connection.CreateCommand(); command.CommandText = "SELECT id,user_id,created_at,last_used_at,absolute_expires_at,revoked_at,user_agent FROM auth_sessions WHERE user_id=@UserId ORDER BY created_at DESC";
        command.Parameters.AddWithValue("@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync(token); var result = new List<AuthenticationSession>();
        while (await reader.ReadAsync(token)) result.Add(ReadSession(reader));
        return result;
    }

    public async Task<IReadOnlyList<ERP.Application.Contracts.MembershipSummary>> ListMembershipsAsync(MySqlConnection connection, string userId, CancellationToken token) =>
        (await connection.QueryAsync<ERP.Application.Contracts.MembershipSummary>(new CommandDefinition("SELECT t.id TenantId,t.name TenantName,t.slug TenantSlug,m.status Status FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.user_id=@UserId ORDER BY t.name", new { UserId = userId }, cancellationToken: token))).AsList();

    private static AuthenticationSession ReadSession(MySqlDataReader reader) => new(ReadIdentifier(reader, 0), ReadIdentifier(reader, 1), reader.GetDateTime(2), reader.GetDateTime(3), reader.GetDateTime(4), reader.IsDBNull(5) ? null : reader.GetDateTime(5), reader.IsDBNull(6) ? null : reader.GetString(6));

    private static string ReadIdentifier(MySqlDataReader reader, int ordinal) => reader.GetValue(ordinal) switch
    {
        Guid value => value.ToString(),
        string value => value,
        var value => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture)
            ?? throw new InvalidOperationException("Database identifier cannot be null.")
    };
}
