using System.Text.Json;
using System.Text.Json.Serialization;

namespace ERP.Application.Contracts;

public sealed class LoginRequest
{
    public string? Email { get; init; }
    public string? Password { get; init; }
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

public sealed record PublicUser(string Id, string Name, string Email);
public sealed record AccessTokenResult(string AccessToken, string TokenType, int ExpiresIn);
public sealed record LoginResult(string AccessToken, string TokenType, int ExpiresIn, PublicUser User, string RefreshToken, DateTime SessionExpiresAtUtc);
public sealed record RefreshResult(string AccessToken, string TokenType, int ExpiresIn, string RefreshToken, DateTime SessionExpiresAtUtc);
public sealed record MembershipSummary(string TenantId, string TenantName, string TenantSlug, string Status);
public sealed record CurrentIdentity(string Id, string Name, string Email, string Status, IReadOnlyList<MembershipSummary> Memberships);
public sealed record SessionSummary(string Id, DateTime CreatedAtUtc, DateTime LastUsedAtUtc, DateTime ExpiresAtUtc, string Status, string? Device, bool Current);
