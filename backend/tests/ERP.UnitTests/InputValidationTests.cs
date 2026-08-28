using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Application;

namespace ERP.UnitTests;

public sealed class InputValidationTests
{
    [Fact]
    public void Onboarding_NormalizesEveryPublicIdentifierAndContact()
    {
        var normalized = InputValidation.Normalize(ValidRequest());
        Assert.Equal("empresa-agil", normalized.Tenant.Slug);
        Assert.Equal("11222333000181", normalized.Company.TaxId);
        Assert.Equal("owner@example.com", normalized.Owner.Email);
        Assert.Equal("11999998888", normalized.Owner.Phone);
        Assert.Equal("01310100", normalized.Branch.Address?.PostalCode);
        Assert.Equal("SP", normalized.Branch.Address?.State);
        Assert.Equal("PUBLIC", normalized.PlanCode);
    }

    [Fact]
    public void Onboarding_RejectsUnknownAuthorityFields()
    {
        var input = ValidRequest(rootExtra: true);
        var error = Assert.Throws<DomainException>(() => InputValidation.Normalize(input));
        Assert.Equal("VALIDATION_ERROR", error.Code);
    }

    [Fact]
    public void Onboarding_RejectsInvalidCnpjAndDoesNotAcceptPassword()
    {
        var input = ValidRequest(taxId: "00000000000000");
        Assert.Equal("VALIDATION_ERROR", Assert.Throws<DomainException>(() => InputValidation.Normalize(input)).Code);
        input = ValidRequest(ownerExtra: true);
        Assert.Equal("VALIDATION_ERROR", Assert.Throws<DomainException>(() => InputValidation.Normalize(input)).Code);
    }

    [Theory]
    [InlineData("curta")]
    [InlineData("            ")]
    public void PasswordSetup_EnforcesPolicy(string password)
    {
        var error = Assert.Throws<DomainException>(() => InputValidation.Validate(new PasswordSetupConfirmRequest { Token = "token", Password = password }));
        Assert.Equal("PASSWORD_POLICY_VIOLATION", error.Code);
    }

    private static OnboardingRequest ValidRequest(string taxId = "11.222.333/0001-81", bool rootExtra = false, bool ownerExtra = false) => new()
    {
        Tenant = new TenantRequest { Name = " Empresa Ágil ", Slug = " Empresa Ágil " },
        Company = new CompanyRequest { LegalName = " Empresa Ltda ", TaxId = taxId },
        Branch = new BranchRequest
        {
            LegalName = " Matriz ",
            Address = new BranchAddressRequest { PostalCode = "01310-100", Street = " Rua ", Number = " 1 ", District = " Centro ", City = " São Paulo ", State = "sp" }
        },
        Owner = new OwnerRequest { Name = " Owner ", Email = " OWNER@EXAMPLE.COM ", Phone = "(11) 99999-8888", Extra = ownerExtra ? new Dictionary<string, System.Text.Json.JsonElement> { ["password"] = default } : null },
        PlanCode = " public ",
        Extra = rootExtra ? new Dictionary<string, System.Text.Json.JsonElement> { ["status"] = default } : null
    };
}
