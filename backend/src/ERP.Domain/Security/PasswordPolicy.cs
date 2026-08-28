namespace ERP.Domain.Security;

public static class PasswordPolicy
{
    public const int MinimumLength = 12;
    public const int MaximumLength = 128;

    public static bool IsValid(string? password) =>
        password is not null &&
        password.Length is >= MinimumLength and <= MaximumLength &&
        password.Any(character => !char.IsWhiteSpace(character));
}
