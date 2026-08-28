using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

public sealed record CredentialUserRecord(string Id, string Email);
public sealed record PasswordSetupTokenRecord(string Id, string UserId, string Purpose, DateTime ExpiresAt, DateTime? UsedAt, DateTime? RevokedAt);
public sealed record PasswordSetupTokenWrite(string Id, string UserId, string TokenHash, string Purpose, DateTime ExpiresAt, DateTime CreatedAt);
public sealed record CredentialWrite(string Id, string UserId, string PasswordHash, DateTime CreatedAt);

public sealed class PasswordSetupRepository
{
    public Task<CredentialUserRecord?> FindUserByIdForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<CredentialUserRecord>(Command(
            "SELECT id,email FROM users WHERE id=@UserId LIMIT 1 FOR UPDATE", new { UserId = userId }, transaction, token));

    public Task<string?> FindCredentialIdByUserIdAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<string?>(Command(
            "SELECT id FROM user_credentials WHERE user_id=@UserId LIMIT 1", new { UserId = userId }, transaction, token));

    public Task<int> RevokeActiveTokensAsync(MySqlConnection connection, MySqlTransaction transaction, string userId, string purpose, DateTime revokedAt, CancellationToken token) =>
        connection.ExecuteAsync(Command(
            "UPDATE password_setup_tokens SET revoked_at=@RevokedAt,updated_at=@RevokedAt WHERE user_id=@UserId AND purpose=@Purpose AND used_at IS NULL AND revoked_at IS NULL",
            new { UserId = userId, Purpose = purpose, RevokedAt = revokedAt }, transaction, token));

    public async Task CreateTokenAsync(MySqlConnection connection, MySqlTransaction transaction, PasswordSetupTokenWrite value, CancellationToken token) =>
        _ = await connection.ExecuteAsync(Command(
            "INSERT INTO password_setup_tokens (id,user_id,token_hash,purpose,expires_at,created_at,updated_at) VALUES (@Id,@UserId,@TokenHash,@Purpose,@ExpiresAt,@CreatedAt,@CreatedAt)", value, transaction, token));

    public Task<PasswordSetupTokenRecord?> FindTokenByHashForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string tokenHash, CancellationToken token) =>
        connection.QuerySingleOrDefaultAsync<PasswordSetupTokenRecord>(Command(
            "SELECT id,user_id AS UserId,purpose,expires_at AS ExpiresAt,used_at AS UsedAt,revoked_at AS RevokedAt FROM password_setup_tokens WHERE token_hash=@TokenHash LIMIT 1 FOR UPDATE",
            new { TokenHash = tokenHash }, transaction, token));

    public async Task CreateCredentialAsync(MySqlConnection connection, MySqlTransaction transaction, CredentialWrite value, CancellationToken token) =>
        _ = await connection.ExecuteAsync(Command(
            "INSERT INTO user_credentials (id,user_id,password_hash,created_at,updated_at) VALUES (@Id,@UserId,@PasswordHash,@CreatedAt,@CreatedAt)", value, transaction, token));

    public Task<int> MarkTokenUsedAsync(MySqlConnection connection, MySqlTransaction transaction, string tokenId, DateTime usedAt, CancellationToken token) =>
        connection.ExecuteAsync(Command(
            "UPDATE password_setup_tokens SET used_at=@UsedAt,updated_at=@UsedAt WHERE id=@TokenId AND used_at IS NULL AND revoked_at IS NULL",
            new { TokenId = tokenId, UsedAt = usedAt }, transaction, token));

    private static CommandDefinition Command(string sql, object parameters, MySqlTransaction transaction, CancellationToken token) =>
        new(sql, parameters, transaction, cancellationToken: token);
}
