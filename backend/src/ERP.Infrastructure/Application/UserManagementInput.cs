using System.Net.Mail;
using ERP.Application.Contracts;
using ERP.Domain.Business;
using ERP.Domain.Security;

namespace ERP.Infrastructure.Application;

// Validação compartilhada normaliza entradas antes da abertura de transações e reutiliza a política oficial de senha.
public static class UserManagementInput
{
    public static UserCreation Validate(CreateUserEmployeeRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || request.Ativo is null)
            throw BusinessErrors.Validation("Os dados informados são inválidos.");
        var password = request.Password ?? "";
        if (!PasswordPolicy.IsValid(password)) throw BusinessErrors.Validation("A senha não atende à política de segurança.");
        return new(Required(request.UserName, 100, "userName"), Email(request.Email), password,
            Required(request.NomeFuncionario, 160, "nomeFuncionario"), request.Ativo.Value,
            Identifier(request.IdPerfil, "idPerfil"), Identifiers(request.IdsLojas));
    }

    public static UserUpdate Validate(UpdateManagedUserRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || request.Ativo is null)
            throw BusinessErrors.Validation("Os dados informados são inválidos.");
        return new(Required(request.UserName, 100, "userName"), Email(request.Email), request.Ativo.Value);
    }

    public static string ValidateEmployee(UpdateManagedEmployeeRequest? request) =>
        request is null || request.Extra is { Count: > 0 }
            ? throw BusinessErrors.Validation("Os dados informados são inválidos.")
            : Required(request.Nome, 160, "nome");

    public static string ValidateProfile(UpdateManagedProfileRequest? request) =>
        request is null || request.Extra is { Count: > 0 }
            ? throw BusinessErrors.Validation("Os dados informados são inválidos.")
            : Identifier(request.IdPerfil, "idPerfil");

    public static IReadOnlyList<string> ValidateStores(UpdateManagedStoresRequest? request) =>
        request is null || request.Extra is { Count: > 0 }
            ? throw BusinessErrors.Validation("Os dados informados são inválidos.")
            : Identifiers(request.IdsLojas);

    private static string Required(string? value, int maximum, string field)
    {
        var result = value?.Trim() ?? "";
        if (result.Length == 0 || result.Length > maximum) throw BusinessErrors.Validation($"O campo {field} é obrigatório e deve possuir no máximo {maximum} caracteres.");
        return result;
    }

    private static string Email(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length is 0 or > 254 || !MailAddress.TryCreate(email, out var parsed) || !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
            throw BusinessErrors.Validation("Informe um e-mail válido.");
        return email;
    }

    private static string Identifier(string? value, string field) =>
        Guid.TryParse(value, out var parsed) ? parsed.ToString() : throw BusinessErrors.Validation($"O campo {field} é inválido.");

    private static IReadOnlyList<string> Identifiers(IReadOnlyList<string>? values)
    {
        if (values is null) throw BusinessErrors.Validation("O campo idsLojas é obrigatório.");
        var result = values.Select(value => Identifier(value, "idsLojas")).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (result.Length != values.Count) throw BusinessErrors.Validation("A lista de lojas contém identificadores duplicados.");
        return result;
    }
}

// Valores internos validados impedem que repository dependa diretamente de payload HTTP.
public sealed record UserCreation(string UserName, string Email, string Password, string EmployeeName, bool Active, string ProfileId, IReadOnlyList<string> StoreIds);
public sealed record UserUpdate(string UserName, string Email, bool Active);
