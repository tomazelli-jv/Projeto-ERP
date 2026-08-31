namespace ERP.Infrastructure.Security;

public sealed class AuthenticationOptions
{
    public const string SectionName = "Authentication";
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public string SigningKey { get; init; } = "";
    public int AccessTokenMinutes { get; init; } = 10;
    public int SessionDays { get; init; } = 30;
    public int ClockSkewSeconds { get; init; } = 30;
    public string RefreshCookieName { get; init; } = "erp_refresh";
    public int LoginFailureLimit { get; init; } = 5;
    public int LoginWindowMinutes { get; init; } = 15;
    public int LoginBlockMinutes { get; init; } = 15;
}
