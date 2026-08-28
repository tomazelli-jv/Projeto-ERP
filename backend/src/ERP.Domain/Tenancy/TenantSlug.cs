using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ERP.Domain.Tenancy;

public static partial class TenantSlug
{
    public static string Normalize(string? value)
    {
        var decomposed = (value ?? string.Empty).Normalize(NormalizationForm.FormD);
        var withoutMarks = string.Concat(decomposed.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark));
        return TrimHyphensRegex().Replace(InvalidCharactersRegex().Replace(withoutMarks.Trim().ToLowerInvariant(), "-"), string.Empty);
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex InvalidCharactersRegex();

    [GeneratedRegex("^-+|-+$")]
    private static partial Regex TrimHyphensRegex();
}
