using System.Text.Json.Serialization;

namespace ERP.Application.Contracts;

public sealed class PasswordSetupConfirmRequest
{
    public required string Token { get; init; }
    public required string Password { get; init; }
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed record PasswordSetupResult(bool PasswordDefined);
