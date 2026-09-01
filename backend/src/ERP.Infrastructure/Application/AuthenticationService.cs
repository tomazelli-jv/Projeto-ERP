using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Security;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;
using ERP.Infrastructure.Security;
using Microsoft.Extensions.Options;

namespace ERP.Infrastructure.Application;

public sealed class AuthenticationService(
    IMariaDbConnectionFactory connections,
    AuthenticationRepository repository,
    IPasswordHasher passwordHasher,
    IAccessTokenService accessTokens,
    IRefreshTokenGenerator refreshTokens,
    IOptions<AuthenticationOptions> options)
{
    private readonly AuthenticationOptions _options = options.Value;
    private readonly Lazy<Task<string>> _dummyHash = new(() => passwordHasher.HashAsync("timing-mitigation-password-never-used"));

    public async Task<LoginResult> LoginAsync(LoginRequest? request, string? ip, string? userAgent, CancellationToken token)
    {
        var input = AuthenticationInput.Validate(request);
        var now = DateTime.UtcNow;
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        var completed = false;
        try
        {
            var failures = await repository.CountRecentFailuresAsync(connection, transaction, input.EmailHash, now.AddMinutes(-_options.LoginWindowMinutes * 4), token);
            var latestFailure = await repository.LatestFailureAsync(connection, transaction, input.EmailHash, token);
            var blockTier = Math.Min(4, Math.Max(1, failures / _options.LoginFailureLimit));
            if (failures >= _options.LoginFailureLimit && latestFailure?.AddMinutes(_options.LoginBlockMinutes * blockTier) > now)
            {
                await transaction.CommitAsync(token);
                completed = true;
                throw AuthenticationErrors.TemporarilyBlocked();
            }

            var user = await repository.FindUserByEmailAsync(connection, transaction, input.Email, token);
            var hash = user?.PasswordHash ?? await _dummyHash.Value;
            var passwordValid = await passwordHasher.VerifyAsync(hash, input.Password, token);
            if (user is null || !passwordValid || !user.Active)
            {
                await repository.InsertLoginAttemptAsync(connection, transaction, input.EmailHash, user?.Id, false, "invalid_credentials", ip, now, token);
                await repository.InsertSecurityEventAsync(connection, transaction, user?.Id, null, "login_refused", "failure", ip, now, token);
                await transaction.CommitAsync(token);
                completed = true;
                throw AuthenticationErrors.InvalidCredentials();
            }

            var sessionId = Guid.NewGuid().ToString();
            var familyId = Guid.NewGuid().ToString();
            var tokenId = Guid.NewGuid().ToString();
            var expires = now.AddDays(_options.SessionDays);
            var refresh = refreshTokens.Generate();
            await repository.CreateSessionAsync(connection, transaction, sessionId, user.Id, now, expires, Limit(ip, 45), Limit(userAgent, 255), token);
            await repository.CreateRefreshTokenAsync(connection, transaction, tokenId, sessionId, refresh.Hash, familyId, null, now, expires, token);
            await repository.InsertLoginAttemptAsync(connection, transaction, input.EmailHash, user.Id, true, "success", ip, now, token);
            await repository.InsertSecurityEventAsync(connection, transaction, user.Id, sessionId, "login_succeeded", "success", ip, now, token);
            await repository.InsertSecurityEventAsync(connection, transaction, user.Id, sessionId, "session_created", "success", ip, now, token);
            await transaction.CommitAsync(token);
            completed = true;
            return new LoginResult(accessTokens.Create(user.Id, sessionId, now), "Bearer", accessTokens.LifetimeSeconds, new(user.Id, user.Name, user.Email), refresh.RawToken, expires);
        }
        catch { if (!completed) await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    public async Task<RefreshResult> RefreshAsync(string rawToken, string? ip, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(rawToken) || rawToken.Length > 512) throw AuthenticationErrors.RefreshInvalid();
        var hash = refreshTokens.Hash(rawToken); var now = DateTime.UtcNow;
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        var completed = false;
        try
        {
            var current = await repository.FindRefreshForUpdateAsync(connection, transaction, hash, token) ?? throw AuthenticationErrors.RefreshInvalid();
            var session = await repository.FindSessionForUpdateAsync(connection, transaction, current.SessionId, token) ?? throw AuthenticationErrors.SessionInvalid();
            if (current.UsedAtUtc is not null)
            {
                await repository.RevokeFamilyAsync(connection, transaction, current.FamilyId, "refresh_reuse", now, token);
                await repository.RevokeSessionAsync(connection, transaction, session.Id, "refresh_reuse", now, token);
                await repository.InsertSecurityEventAsync(connection, transaction, session.UserId, session.Id, "refresh_token_reused", "denied", ip, now, token);
                await transaction.CommitAsync(token);
                completed = true;
                throw AuthenticationErrors.RefreshReused();
            }
            if (current.RevokedAtUtc is not null) throw AuthenticationErrors.RefreshInvalid();
            if (current.ExpiresAtUtc <= now) throw AuthenticationErrors.RefreshExpired();
            if (session.RevokedAtUtc is not null) throw AuthenticationErrors.SessionRevoked();
            if (session.AbsoluteExpiresAtUtc <= now) throw AuthenticationErrors.SessionExpired();
            var user = await repository.FindUserByIdAsync(connection, transaction, session.UserId, token);
            if (user is null || !user.Active) throw AuthenticationErrors.RefreshInvalid();
            var successorId = Guid.NewGuid().ToString(); var next = refreshTokens.Generate();
            await repository.MarkRefreshUsedAsync(connection, transaction, current.Id, successorId, now, token);
            await repository.CreateRefreshTokenAsync(connection, transaction, successorId, session.Id, next.Hash, current.FamilyId, current.Id, now, session.AbsoluteExpiresAtUtc, token);
            await repository.TouchSessionAsync(connection, transaction, session.Id, now, token);
            await repository.InsertSecurityEventAsync(connection, transaction, session.UserId, session.Id, "refresh_succeeded", "success", ip, now, token);
            await transaction.CommitAsync(token);
            completed = true;
            return new RefreshResult(accessTokens.Create(session.UserId, session.Id, now), "Bearer", accessTokens.LifetimeSeconds, next.RawToken, session.AbsoluteExpiresAtUtc);
        }
        catch { if (!completed) await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    public async Task LogoutAsync(string? rawToken, string? ip, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return;
        await using var connection = await connections.OpenConnectionAsync(token); await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            var current = await repository.FindRefreshForUpdateAsync(connection, transaction, refreshTokens.Hash(rawToken), token);
            if (current is not null)
            {
                var session = await repository.FindSessionForUpdateAsync(connection, transaction, current.SessionId, token);
                if (session is not null) { await repository.RevokeSessionAsync(connection, transaction, session.Id, "logout", DateTime.UtcNow, token); await repository.InsertSecurityEventAsync(connection, transaction, session.UserId, session.Id, "logout", "success", ip, DateTime.UtcNow, token); }
            }
            await transaction.CommitAsync(token);
        }
        catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    public async Task LogoutAllAsync(string userId, string sessionId, string? ip, CancellationToken token) => await InTransaction(async (connection, transaction) =>
    {
        await repository.RevokeAllAsync(connection, transaction, userId, "logout_all", DateTime.UtcNow, token);
        await repository.InsertSecurityEventAsync(connection, transaction, userId, sessionId, "logout_all", "success", ip, DateTime.UtcNow, token);
    }, token);

    public async Task RevokeSessionAsync(string userId, string currentSessionId, string targetSessionId, string? ip, CancellationToken token) => await InTransaction(async (connection, transaction) =>
    {
        var target = await repository.FindSessionForUpdateAsync(connection, transaction, targetSessionId, token);
        if (target is not null && target.UserId == userId) { await repository.RevokeSessionAsync(connection, transaction, target.Id, "user_revoked", DateTime.UtcNow, token); await repository.InsertSecurityEventAsync(connection, transaction, userId, target.Id, "session_revoked", "success", ip, DateTime.UtcNow, token); }
    }, token);

    public async Task<CurrentIdentity> MeAsync(string userId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var user = await repository.FindUserByIdAsync(connection, null, userId, token) ?? throw AuthenticationErrors.SessionInvalid();
        return new(user.Id, user.Name, user.Email, user.Active ? "active" : "inactive");
    }

    public async Task<IReadOnlyList<SessionSummary>> SessionsAsync(string userId, string currentSessionId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token); var now = DateTime.UtcNow;
        return (await repository.ListSessionsAsync(connection, userId, token)).Select(x => new SessionSummary(x.Id, x.CreatedAtUtc, x.LastUsedAtUtc, x.AbsoluteExpiresAtUtc, x.RevokedAtUtc is not null ? "revoked" : x.AbsoluteExpiresAtUtc <= now ? "expired" : "active", x.UserAgent, x.Id == currentSessionId)).ToArray();
    }

    public async Task<bool> ValidateSessionAsync(string userId, string sessionId, CancellationToken token)
    { await using var connection = await connections.OpenConnectionAsync(token); return await repository.IsSessionActiveAsync(connection, sessionId, userId, DateTime.UtcNow, token); }

    private async Task InTransaction(Func<MySqlConnector.MySqlConnection, MySqlConnector.MySqlTransaction, Task> action, CancellationToken token)
    { await using var connection = await connections.OpenConnectionAsync(token); await using var transaction = await connection.BeginTransactionAsync(token); try { await action(connection, transaction); await transaction.CommitAsync(token); } catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; } }
    private static string? Limit(string? value, int max) => string.IsNullOrWhiteSpace(value) ? null : value.Length <= max ? value : value[..max];
}
