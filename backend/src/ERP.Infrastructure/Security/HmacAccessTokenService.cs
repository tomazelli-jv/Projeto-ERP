using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ERP.Application.Abstractions;
using ERP.Domain.Security;
using ERP.Domain.Errors;
using Microsoft.Extensions.Options;

namespace ERP.Infrastructure.Security;

public sealed class HmacAccessTokenService(IOptions<AuthenticationOptions> options) : IAccessTokenService
{
    private readonly AuthenticationOptions _options = options.Value;
    public int LifetimeSeconds => checked(_options.AccessTokenMinutes * 60);

    public string Create(string userId, string sessionId, DateTime nowUtc)
    {
        var now = new DateTimeOffset(nowUtc).ToUnixTimeSeconds();
        var header = Encode(JsonSerializer.SerializeToUtf8Bytes(new { alg = "HS256", typ = "JWT" }));
        var payload = Encode(JsonSerializer.SerializeToUtf8Bytes(new Dictionary<string, object>
        {
            ["sub"] = userId,
            ["sid"] = sessionId,
            ["jti"] = Guid.NewGuid().ToString(),
            ["iat"] = now,
            ["nbf"] = now,
            ["exp"] = now + LifetimeSeconds,
            ["iss"] = _options.Issuer,
            ["aud"] = _options.Audience
        }));
        var unsigned = $"{header}.{payload}";
        return $"{unsigned}.{Encode(Sign(unsigned))}";
    }

    public AccessTokenIdentity Validate(string token, DateTime nowUtc)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 3) throw AuthenticationErrors.AccessInvalid();
            using var header = JsonDocument.Parse(Decode(parts[0]));
            if (header.RootElement.GetProperty("alg").GetString() != "HS256") throw AuthenticationErrors.AccessInvalid();
            if (!CryptographicOperations.FixedTimeEquals(Sign($"{parts[0]}.{parts[1]}"), Decode(parts[2]))) throw AuthenticationErrors.AccessInvalid();
            using var payload = JsonDocument.Parse(Decode(parts[1]));
            string RequiredString(string name) => payload.RootElement.GetProperty(name).GetString() ?? throw AuthenticationErrors.AccessInvalid();
            var sub = RequiredString("sub"); var sid = RequiredString("sid"); var jti = RequiredString("jti");
            if (!Guid.TryParse(sub, out _) || !Guid.TryParse(sid, out _) || !Guid.TryParse(jti, out _)) throw AuthenticationErrors.AccessInvalid();
            if (RequiredString("iss") != _options.Issuer || RequiredString("aud") != _options.Audience) throw AuthenticationErrors.AccessInvalid();
            var exp = payload.RootElement.GetProperty("exp").GetInt64();
            var nbf = payload.RootElement.GetProperty("nbf").GetInt64();
            var now = new DateTimeOffset(nowUtc).ToUnixTimeSeconds();
            if (now > exp + _options.ClockSkewSeconds) throw AuthenticationErrors.AccessExpired();
            if (now + _options.ClockSkewSeconds < nbf) throw AuthenticationErrors.AccessInvalid();
            return new AccessTokenIdentity(sub, sid, jti, DateTimeOffset.FromUnixTimeSeconds(exp).UtcDateTime);
        }
        catch (DomainException) { throw; }
        catch (Exception exception) when (exception is JsonException or FormatException or KeyNotFoundException or InvalidOperationException)
        { throw AuthenticationErrors.AccessInvalid(); }
    }

    private byte[] Sign(string value) => HMACSHA256.HashData(Encoding.UTF8.GetBytes(_options.SigningKey), Encoding.ASCII.GetBytes(value));
    private static string Encode(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static byte[] Decode(string value) => Convert.FromBase64String(value.Replace('-', '+').Replace('_', '/').PadRight(value.Length + (4 - value.Length % 4) % 4, '='));
}
