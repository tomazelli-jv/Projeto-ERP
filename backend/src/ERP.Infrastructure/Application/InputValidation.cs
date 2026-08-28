using System.Net.Mail;
using System.Diagnostics.CodeAnalysis;
using ERP.Application.Contracts;
using ERP.Domain.Brazil;
using ERP.Domain.Errors;
using ERP.Domain.Security;
using ERP.Domain.Tenancy;

namespace ERP.Infrastructure.Application;

public static class InputValidation
{
    public static OnboardingRequest Normalize(OnboardingRequest? input)
    {
        if (input is null) Invalid();
        var tenant = input.Tenant ?? InvalidObject<TenantRequest>();
        var company = input.Company ?? InvalidObject<CompanyRequest>();
        var branch = input.Branch ?? InvalidObject<BranchRequest>();
        var owner = input.Owner ?? InvalidObject<OwnerRequest>();
        if (HasExtra(input.Extra, tenant.Extra, company.Extra, branch.Extra, branch.Address?.Extra, owner.Extra)) Invalid();
        Require(tenant.Name, 160);
        Require(company.LegalName, 180);
        Require(branch.LegalName, 180);
        Require(owner.Name, 160);
        Require(input.PlanCode, 50);
        Optional(company.TradeName, 180);
        Optional(branch.TradeName, 180);
        Optional(branch.Code, 50, required: true);
        Optional(branch.Phone, 30);
        Optional(owner.Phone, 30);

        var slug = TenantSlug.Normalize(tenant.Slug);
        if (slug.Length is < 1 or > 100) Invalid();
        var taxId = Cnpj.Normalize(company.TaxId);
        if (!Cnpj.IsValid(taxId)) Invalid();
        var ownerEmail = Email(owner.Email);
        var branchEmail = branch.Email is null ? null : Email(branch.Email);
        var ownerPhone = Digits(owner.Phone);
        var branchPhone = Digits(branch.Phone);
        if (ownerPhone is { Length: > 0 } && ownerPhone.Length is < 10 or > 13) Invalid();
        if (branchPhone is { Length: > 0 } && branchPhone.Length is < 10 or > 13) Invalid();

        BranchAddressRequest? address = null;
        if (branch.Address is not null)
        {
            var source = branch.Address;
            var postalCode = Digits(source.PostalCode);
            if (postalCode?.Length != 8) Invalid();
            Require(source.Street, 180); Require(source.Number, 30); Require(source.District, 120); Require(source.City, 120);
            Optional(source.Complement, 120);
            var state = source.State?.Trim().ToUpperInvariant();
            var country = source.CountryCode?.Trim().ToUpperInvariant();
            if (state?.Length != 2 || !state.All(char.IsAsciiLetterUpper) || country?.Length != 2 || !country.All(char.IsAsciiLetterUpper)) Invalid();
            address = new BranchAddressRequest { PostalCode = postalCode!, Street = source.Street.Trim(), Number = source.Number.Trim(), Complement = NullIfEmpty(source.Complement), District = source.District.Trim(), City = source.City.Trim(), State = state!, CountryCode = country! };
        }

        return new OnboardingRequest
        {
            Tenant = new TenantRequest { Name = tenant.Name.Trim(), Slug = slug },
            Company = new CompanyRequest { LegalName = company.LegalName.Trim(), TradeName = NullIfEmpty(company.TradeName), TaxId = taxId },
            Branch = new BranchRequest { Code = branch.Code.Trim(), LegalName = branch.LegalName.Trim(), TradeName = NullIfEmpty(branch.TradeName), Email = branchEmail, Phone = branchPhone, Address = address },
            Owner = new OwnerRequest { Name = owner.Name.Trim(), Email = ownerEmail, Phone = ownerPhone },
            PlanCode = input.PlanCode.Trim().ToUpperInvariant()
        };
    }

    public static PasswordSetupConfirmRequest Validate(PasswordSetupConfirmRequest? input)
    {
        if (input is null || HasExtra(input.Extra) || string.IsNullOrEmpty(input.Token) || input.Token.Length > 512) Invalid();
        if (!PasswordPolicy.IsValid(input.Password))
            throw new DomainException("PASSWORD_POLICY_VIOLATION", "A senha não atende à política de segurança.", 400);
        return input;
    }

    private static string Email(string? value)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        if (normalized is null || normalized.Length > 254 || !MailAddress.TryCreate(normalized, out var parsed) || !string.Equals(parsed.Address, normalized, StringComparison.OrdinalIgnoreCase)) Invalid();
        return normalized;
    }
    private static string? Digits(string? value) => value is null ? null : new string(value.Where(char.IsAsciiDigit).ToArray());
    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static bool HasExtra(params IDictionary<string, System.Text.Json.JsonElement>?[] values) => values.Any(value => value is { Count: > 0 });
    private static void Require(string? value, int max) { if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > max) Invalid(); }
    private static void Optional(string? value, int max, bool required = false) { if ((required && string.IsNullOrWhiteSpace(value)) || value?.Trim().Length > max) Invalid(); }
    [DoesNotReturn] private static void Invalid() => throw new DomainException("VALIDATION_ERROR", "Os dados informados são inválidos.", 400);
    private static T InvalidObject<T>() { Invalid(); return default!; }
}
