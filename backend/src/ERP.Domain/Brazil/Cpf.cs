using System.Text.RegularExpressions;

namespace ERP.Domain.Brazil;

public static partial class Cpf
{
    // CPF removes only its visual punctuation so unknown characters cannot be silently transformed into another identity.
    public static bool TryNormalize(string? value, out string normalized)
    {
        var candidate = (value ?? string.Empty).Trim();
        if (!AllowedInput().IsMatch(candidate)) { normalized = string.Empty; return false; }
        normalized = Punctuation().Replace(candidate, string.Empty);
        return true;
    }

    public static bool IsValid(string? value)
    {
        if (!TryNormalize(value, out var cpf) || cpf.Length != 11 || cpf.Any(character => character is < '0' or > '9') || cpf.Distinct().Count() == 1) return false;
        var first = Digit(cpf[..9], 10); var second = Digit(cpf[..10], 11);
        return cpf.EndsWith($"{first}{second}", StringComparison.Ordinal);
    }

    // CPF weights descend to 2; remainder 10 or 11 maps to zero per the Brazilian rule.
    private static int Digit(string value, int initialWeight)
    {
        var remainder = value.Select((character, index) => (character - '0') * (initialWeight - index)).Sum() % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    [GeneratedRegex("^[0-9.-]*$", RegexOptions.CultureInvariant)] private static partial Regex AllowedInput();
    [GeneratedRegex("[.-]", RegexOptions.CultureInvariant)] private static partial Regex Punctuation();
}
