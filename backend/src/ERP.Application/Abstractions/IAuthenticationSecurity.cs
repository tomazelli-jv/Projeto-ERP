namespace ERP.Application.Abstractions;

public sealed record AccessTokenIdentity(string UserId, string SessionId, string TokenId, DateTime ExpiresAtUtc);

public interface IAccessTokenService
{
    string Create(string userId, string sessionId, DateTime nowUtc);
    AccessTokenIdentity Validate(string token, DateTime nowUtc);
    int LifetimeSeconds { get; }
}

public interface IRefreshTokenGenerator
{
    (string RawToken, string Hash) Generate();
    string Hash(string rawToken);
}
