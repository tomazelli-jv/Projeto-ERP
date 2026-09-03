using System.Net.Mail;
using ERP.Application.Abstractions;
using ERP.Domain.Security;

namespace ERP.AdminCli;

public sealed record ResetPasswordInput(string? Email, string? Password, string? PasswordConfirmation);

public interface IUserPasswordRepository
{
    Task<bool> UpdatePasswordAsync(string email, string passwordHash, CancellationToken cancellationToken = default);
}

public sealed class ResetPasswordValidationException(string message) : Exception(message);
public sealed class ResetPasswordUserNotFoundException(string message) : Exception(message);

public sealed class ResetPasswordService(IUserPasswordRepository repository, IPasswordHasher passwordHasher)
{
    public async Task<string> ResetAsync(ResetPasswordInput input, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(input.Email);
        var password = input.Password ?? "";
        if (!PasswordPolicy.IsValid(password))
            throw new ResetPasswordValidationException("A senha não atende à política de segurança.");
        if (!string.Equals(password, input.PasswordConfirmation, StringComparison.Ordinal))
            throw new ResetPasswordValidationException("A confirmação da senha não confere.");

        var passwordHash = await passwordHasher.HashAsync(password, cancellationToken);
        if (!await repository.UpdatePasswordAsync(email, passwordHash, cancellationToken))
            throw new ResetPasswordUserNotFoundException("Nenhum usuário foi encontrado com este e-mail.");

        return email;
    }

    private static string NormalizeEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length is 0 or > 254 || !MailAddress.TryCreate(email, out var parsed) ||
            !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
            throw new ResetPasswordValidationException("Informe um e-mail válido.");
        return email;
    }
}
