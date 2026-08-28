using System.Text.Json.Serialization;

namespace ERP.Application.Contracts;

public sealed class OnboardingRequest
{
    public required TenantRequest Tenant { get; init; }
    public required CompanyRequest Company { get; init; }
    public required BranchRequest Branch { get; init; }
    public required OwnerRequest Owner { get; init; }
    public required string PlanCode { get; init; }
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed class TenantRequest
{
    public required string Name { get; init; }
    public required string Slug { get; init; }
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed class CompanyRequest
{
    public required string LegalName { get; init; }
    public string? TradeName { get; init; }
    public required string TaxId { get; init; }
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed class BranchRequest
{
    public string Code { get; init; } = "001";
    public required string LegalName { get; init; }
    public string? TradeName { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public BranchAddressRequest? Address { get; init; }
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed class BranchAddressRequest
{
    public required string PostalCode { get; init; }
    public required string Street { get; init; }
    public required string Number { get; init; }
    public string? Complement { get; init; }
    public required string District { get; init; }
    public required string City { get; init; }
    public required string State { get; init; }
    public string CountryCode { get; init; } = "BR";
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed class OwnerRequest
{
    public required string Name { get; init; }
    public required string Email { get; init; }
    public string? Phone { get; init; }
    [JsonExtensionData] public IDictionary<string, System.Text.Json.JsonElement>? Extra { get; init; }
}

public sealed record OnboardingResult(
    TenantResult Tenant,
    CompanyResult Company,
    BranchResult Branch,
    OwnerResult Owner,
    SubscriptionResult Subscription);
public sealed record TenantResult(string Id, string Name, string Slug);
public sealed record CompanyResult(string Id, string LegalName);
public sealed record BranchResult(string Id, string Code, string? TradeName);
public sealed record OwnerResult(string Id, string Name, string Email);
public sealed record SubscriptionResult(string Id, string Status, DateTime TrialEndsAt);
