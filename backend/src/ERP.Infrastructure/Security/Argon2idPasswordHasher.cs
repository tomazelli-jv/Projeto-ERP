using System.Security.Cryptography;
using System.Text;
using ERP.Application.Abstractions;
using Konscious.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace ERP.Infrastructure.Security;

public sealed class Argon2idPasswordHasher(IOptions<PasswordSecurityOptions> options) : IPasswordHasher
{
    private readonly PasswordSecurityOptions _options = options.Value;

    public async Task<string> HashAsync(string password, CancellationToken cancellationToken = default)
    {
        var salt = RandomNumberGenerator.GetBytes(_options.SaltLength);
        var hash = await DeriveAsync(password, salt, _options.MemoryCostKiB, _options.Iterations, _options.Parallelism, _options.HashLength, cancellationToken);
        return $"$argon2id$v=19$m={_options.MemoryCostKiB},t={_options.Iterations},p={_options.Parallelism}${Convert.ToBase64String(salt).TrimEnd('=')}${Convert.ToBase64String(hash).TrimEnd('=')}";
    }

    public async Task<bool> VerifyAsync(string encodedHash, string password, CancellationToken cancellationToken = default)
    {
        try
        {
            var parts = encodedHash.Split('$');
            if (parts.Length != 6 || parts[1] != "argon2id" || parts[2] != "v=19") return false;
            var values = parts[3].Split(',').ToDictionary(x => x[..1], x => int.Parse(x[2..], System.Globalization.CultureInfo.InvariantCulture));
            var salt = Decode(parts[4]);
            var expected = Decode(parts[5]);
            var actual = await DeriveAsync(password, salt, values["m"], values["t"], values["p"], expected.Length, cancellationToken);
            return CryptographicOperations.FixedTimeEquals(expected, actual);
        }
        catch (Exception exception) when (exception is FormatException or ArgumentException or IndexOutOfRangeException)
        {
            return false;
        }
    }

    private static async Task<byte[]> DeriveAsync(string password, byte[] salt, int memory, int iterations, int parallelism, int length, CancellationToken cancellationToken)
    {
        using var argon = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            MemorySize = memory,
            Iterations = iterations,
            DegreeOfParallelism = parallelism
        };
        cancellationToken.ThrowIfCancellationRequested();
        var result = await argon.GetBytesAsync(length);
        cancellationToken.ThrowIfCancellationRequested();
        return result;
    }

    private static byte[] Decode(string value)
    {
        var padded = value.PadRight(value.Length + ((4 - value.Length % 4) % 4), '=');
        return Convert.FromBase64String(padded);
    }
}
