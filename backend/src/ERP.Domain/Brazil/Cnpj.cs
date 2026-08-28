using System.Text.RegularExpressions;

namespace ERP.Domain.Brazil;

public static partial class Cnpj
{
    public static string Normalize(string? value) => DigitsRegex().Replace(value ?? string.Empty, string.Empty);

    public static bool IsValid(string? value)
    {
        var digits = Normalize(value);
        if (digits.Length != 14 || digits.Distinct().Count() == 1) return false;
        var first = Calculate(digits[..12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        var second = Calculate($"{digits[..12]}{first}", [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        return digits.EndsWith($"{first}{second}", StringComparison.Ordinal);
    }

    private static int Calculate(string value, int[] weights)
    {
        var sum = weights.Select((weight, index) => (value[index] - '0') * weight).Sum();
        var remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    [GeneratedRegex("[^0-9]")]
    private static partial Regex DigitsRegex();
}
