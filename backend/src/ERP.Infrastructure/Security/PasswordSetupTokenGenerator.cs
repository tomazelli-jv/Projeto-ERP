using System.Security.Cryptography;

namespace ERP.Infrastructure.Security;

public static class PasswordSetupTokenGenerator
{
    public static string Generate() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
        .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
}
