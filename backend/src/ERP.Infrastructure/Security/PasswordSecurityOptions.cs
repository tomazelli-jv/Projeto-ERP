namespace ERP.Infrastructure.Security;

public sealed class PasswordSecurityOptions
{
    public const string SectionName = "PasswordSecurity";
    public int MemoryCostKiB { get; init; } = 19456;
    public int Iterations { get; init; } = 2;
    public int Parallelism { get; init; } = 1;
    public int HashLength { get; init; } = 32;
    public int SaltLength { get; init; } = 16;
    public int SetupTokenTtlHours { get; init; } = 24;
}
