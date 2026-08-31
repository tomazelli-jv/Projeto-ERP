using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Diagnostics.CodeAnalysis;
using ERP.Application.Contracts;
using ERP.Domain.Errors;

namespace ERP.Infrastructure.Application;

public static class AuthenticationInput
{
    public static (string Email, string Password, string EmailHash) Validate(LoginRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password) || request.Password.Length > 128)
            Invalid();
        var validated = request!;
        var email = validated.Email!.Trim().ToLowerInvariant();
        if (email.Length > 254 || !MailAddress.TryCreate(email, out var parsed) || !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase)) Invalid();
        return (email, validated.Password!, HashEmail(email));
    }

    public static string HashEmail(string normalizedEmail) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(normalizedEmail)));
    [DoesNotReturn] private static void Invalid() => throw new DomainException("VALIDATION_ERROR", "Os dados informados são inválidos.", 400);
}
