using ERP.Domain.Brazil;
using ERP.Domain.Security;
using ERP.Domain.Tenancy;

namespace ERP.UnitTests;

public sealed class CoreDomainTests
{
    [Theory]
    [InlineData("11.222.333/0001-81", "11222333000181", true)]
    [InlineData("11.222.333/0001-82", "11222333000182", false)]
    public void NormalizesAndValidatesCnpj(string input, string normalized, bool valid)
    {
        Assert.Equal(normalized, Cnpj.Normalize(input));
        Assert.Equal(valid, Cnpj.IsValid(input));
    }

    [Fact]
    public void NormalizesUrlSafeTenantSlug()
    {
        Assert.Equal("cliente-sao-jose-matriz", TenantSlug.Normalize("  Cliente São José / Matriz  "));
    }

    [Fact]
    public void EnforcesPasswordPolicyWithoutTrimmingPassphrases()
    {
        Assert.True(PasswordPolicy.IsValid("  uma frase senha longa  "));
        Assert.False(PasswordPolicy.IsValid("short"));
        Assert.False(PasswordPolicy.IsValid(new string(' ', 12)));
        Assert.False(PasswordPolicy.IsValid(new string('a', 129)));
    }
}
