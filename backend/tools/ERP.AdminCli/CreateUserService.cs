using System.Net.Mail;
using ERP.Application.Abstractions;
using ERP.Domain.Security;

namespace ERP.AdminCli;

public sealed record CreateUserInput(string? UserName, string? Email, string? Password, string? PasswordConfirmation);
public sealed record CreatedUser(string Id, string Email);
public sealed record UserBootstrapRecord(string Id, string UserName, string Email, string PasswordHash, DateTime CreatedAtUtc);

public enum CreateUserConflict
{
    None,
    Email,
    UserName
}

public interface IUserBootstrapRepository
{
    Task<CreateUserConflict> CreateAsync(UserBootstrapRecord user, CancellationToken cancellationToken = default);
}

public sealed class CreateUserValidationException(string message) : Exception(message);
public sealed class CreateUserConflictException(string message) : Exception(message);

public sealed class CreateUserService(IUserBootstrapRepository repository, IPasswordHasher passwordHasher)
{
    public async Task<CreatedUser> CreateAsync(CreateUserInput input, CancellationToken cancellationToken = default)
    {
        var userName = input.UserName?.Trim() ?? "";
        if (userName.Length is 0 or > 100)
            throw new CreateUserValidationException("O nome de usuário é obrigatório e deve possuir no máximo 100 caracteres.");

        var email = NormalizeEmail(input.Email);
        var password = input.Password ?? "";
        if (!PasswordPolicy.IsValid(password))
            throw new CreateUserValidationException("A senha não atende à política de segurança.");
        if (!string.Equals(password, input.PasswordConfirmation, StringComparison.Ordinal))
            throw new CreateUserValidationException("A confirmação da senha não confere.");

        var id = Guid.NewGuid().ToString();
        var hash = await passwordHasher.HashAsync(password, cancellationToken);
        var conflict = await repository.CreateAsync(
            new UserBootstrapRecord(id, userName, email, hash, DateTime.UtcNow), cancellationToken);
        if (conflict == CreateUserConflict.Email)
            throw new CreateUserConflictException("Já existe um usuário com este e-mail.");
        if (conflict == CreateUserConflict.UserName)
            throw new CreateUserConflictException("Já existe um usuário com este nome de usuário.");
        return new CreatedUser(id, email);
    }

    private static string NormalizeEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length is 0 or > 254 || !MailAddress.TryCreate(email, out var parsed) ||
            !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
            throw new CreateUserValidationException("Informe um e-mail válido.");
        return email;
    }
}
