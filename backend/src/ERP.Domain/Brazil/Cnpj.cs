using System.Text.RegularExpressions;

namespace ERP.Domain.Brazil;

public static partial class Cnpj
{
    // A representação lógica preserva letras e remove somente a pontuação visual oficial; caracteres desconhecidos nunca são descartados silenciosamente.
    public static string Normalize(string? value)
    {
        if (!TryNormalize(value, out var normalized))
            throw new FormatException("CNPJ contains unsupported characters.");
        return normalized;
    }

    public static bool TryNormalize(string? value, out string normalized)
    {
        var candidate = (value ?? string.Empty).Trim().ToUpperInvariant();
        if (!AllowedInputRegex().IsMatch(candidate))
        {
            normalized = string.Empty;
            return false;
        }
        normalized = VisualPunctuationRegex().Replace(candidate, string.Empty);
        return true;
    }

    public static bool IsValid(string? value)
    {
        if (!TryNormalize(value, out var document) || !StructureRegex().IsMatch(document) || document.Distinct().Count() == 1)
            return false;
        var first = Calculate(document[..12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        var second = Calculate($"{document[..12]}{first}", [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        return document.EndsWith($"{first}{second}", StringComparison.Ordinal);
    }

    private static int Calculate(string value, int[] weights)
    {
        // O padrão da Receita atribui a cada caractere o código ASCII menos 48, mantendo dígitos legados com seus valores históricos.
        var sum = weights.Select((weight, index) => (value[index] - 48) * weight).Sum();
        var remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    [GeneratedRegex("^[A-Z0-9./-]*$", RegexOptions.CultureInvariant)]
    private static partial Regex AllowedInputRegex();

    [GeneratedRegex("[./-]", RegexOptions.CultureInvariant)]
    private static partial Regex VisualPunctuationRegex();

    [GeneratedRegex("^[A-Z0-9]{12}[0-9]{2}$", RegexOptions.CultureInvariant)]
    private static partial Regex StructureRegex();
}
