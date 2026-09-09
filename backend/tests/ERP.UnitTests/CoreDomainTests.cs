using ERP.Domain.Brazil;
using ERP.Domain.Security;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;

namespace ERP.UnitTests;

public sealed class CoreDomainTests
{
    [Theory]
    [InlineData("11.222.333/0001-81", "11222333000181", true)]
    [InlineData("11.222.333/0001-82", "11222333000182", false)]
    [InlineData("12.ABC.345/01DE-35", "12ABC34501DE35", true)]
    [InlineData("12.aBc.345/01dE-35", "12ABC34501DE35", true)]
    [InlineData("12ABC34501DE36", "12ABC34501DE36", false)]
    public void NormalizesAndValidatesCnpj(string input, string normalized, bool valid)
    {
        Assert.Equal(normalized, Cnpj.Normalize(input));
        Assert.Equal(valid, Cnpj.IsValid(input));
    }

    [Theory]
    [InlineData("12@ABC.345/01DE-35")]
    [InlineData("12ABC34501DEA5")]
    [InlineData("12ABC34501DE")]
    [InlineData("12ABC34501DE350")]
    public void RejectsUnsupportedCharactersStructureAndCheckDigits(string input)
    {
        Assert.False(Cnpj.IsValid(input));
    }

    [Fact]
    public void NormalizationDoesNotSilentlyRemoveUnknownCharacters()
    {
        // Um caractere desconhecido invalida toda a entrada em vez de produzir outro documento aparentemente válido.
        Assert.False(Cnpj.TryNormalize("12@ABC.345/01DE-35", out _));
        Assert.Throws<FormatException>(() => Cnpj.Normalize("12@ABC.345/01DE-35"));
    }

    [Fact]
    public void BusinessInputNormalizesAlphanumericCnpjAndRejectsInvalidCheckDigits()
    {
        // O teste da fronteira de escrita prova que a API persiste a forma lógica, não a máscara recebida.
        var valid = BusinessInput.ValidateLoja(Loja("12.aBc.345/01dE-35"));
        Assert.Equal("12ABC34501DE35", valid.Documento);

        var error = Assert.Throws<ERP.Domain.Errors.DomainException>(() => BusinessInput.ValidateLoja(Loja("12ABC34501DE36")));
        Assert.Equal("VALIDATION_ERROR", error.Code);
    }

    [Fact]
    public void EnforcesPasswordPolicyWithoutTrimmingPassphrases()
    {
        Assert.True(PasswordPolicy.IsValid("  uma frase senha longa  "));
        Assert.False(PasswordPolicy.IsValid("short"));
        Assert.False(PasswordPolicy.IsValid(new string(' ', 12)));
        Assert.False(PasswordPolicy.IsValid(new string('a', 129)));
    }

    private static LojaWriteRequest Loja(string documento) => new()
    {
        RazaoSocial = "Loja Teste Ltda",
        NomeFantasia = "Loja Teste",
        Documento = documento,
        Ativo = true
    };
}
