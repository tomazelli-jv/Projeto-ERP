using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Security;
using Microsoft.Extensions.Options;

namespace ERP.UnitTests;

public sealed class AuthenticationSecurityTests
{
    private static AuthenticationOptions Settings(string key = "unit-test-key-containing-more-than-32-bytes") => new()
    { Issuer = "issuer", Audience = "audience", SigningKey = key, AccessTokenMinutes = 10, ClockSkewSeconds = 30 };

    [Fact]
    public void LoginSchema_IsStrict_NormalizesOnlyEmail_AndPreservesPassword()
    {
        var result = AuthenticationInput.Validate(new LoginRequest { Email = " USER@Example.COM ", Password = "  exact password  " });
        Assert.Equal("user@example.com", result.Email);
        Assert.Equal("  exact password  ", result.Password);
        Assert.Throws<DomainException>(() => AuthenticationInput.Validate(new LoginRequest { Email = "a@b.com", Password = "password", Extra = new Dictionary<string, System.Text.Json.JsonElement> { ["role"] = default } }));
    }

    [Fact]
    public void RefreshTokens_AreRandomBase64Url_AndHashOnlyBySha256()
    {
        var generator = new RefreshTokenGenerator(); var first = generator.Generate(); var second = generator.Generate();
        Assert.NotEqual(first.RawToken, second.RawToken); Assert.Equal(43, first.RawToken.Length); Assert.Equal(64, first.Hash.Length);
        Assert.Equal(first.Hash, generator.Hash(first.RawToken)); Assert.DoesNotContain(first.RawToken, first.Hash);
    }

    [Fact]
    public void AccessToken_ValidatesClaimsSignatureIssuerAudienceAndExpiration()
    {
        var service = new HmacAccessTokenService(Options.Create(Settings())); var now = DateTime.UtcNow;
        var user = Guid.NewGuid().ToString(); var session = Guid.NewGuid().ToString(); var token = service.Create(user, session, now);
        var identity = service.Validate(token, now.AddMinutes(1));
        Assert.Equal(user, identity.UserId); Assert.Equal(session, identity.SessionId); Assert.True(Guid.TryParse(identity.TokenId, out _)); Assert.Equal(600, service.LifetimeSeconds);
        Assert.Throws<DomainException>(() => new HmacAccessTokenService(Options.Create(Settings("another-unit-test-key-containing-32-bytes"))).Validate(token, now));
        Assert.Throws<DomainException>(() => service.Validate(token, now.AddMinutes(11)));
    }
}
