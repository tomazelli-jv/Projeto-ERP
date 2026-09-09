using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Application;

namespace ERP.UnitTests;

// A fronteira de entrada impede mass assignment e entrega ao repository somente valores canÃ´nicos.
public sealed class CustomerInputTests
{
    [Fact]
    public void NormalizesCpfCnpjAndOptionalFields()
    {
        var person = CustomerInput.Validate(Request("PF", " 529.982.247-25 "));
        Assert.Equal("52998224725", person.Documento);
        Assert.Equal("cliente@example.test", person.Email);

        var company = CustomerInput.Validate(Request("PJ", " 12.aBc.345/01dE-35 "));
        Assert.Equal("12ABC34501DE35", company.Documento);
        Assert.Null(CustomerInput.Validate(Request("PF", "   ")).Documento);
    }

    [Theory]
    [InlineData("PF", "52998224724")]
    [InlineData("PF", "529@98224725")]
    [InlineData("PF", "12ABC34501DE35")]
    [InlineData("PJ", "52998224725")]
    [InlineData("PJ", "12ABC34501DE36")]
    public void RejectsInvalidOrTypeIncompatibleDocuments(string type, string document)
    {
        var error = Assert.Throws<DomainException>(() => CustomerInput.Validate(Request(type, document)));
        Assert.Equal("VALIDATION_ERROR", error.Code);
    }

    [Fact]
    public void RejectsServerOwnedFieldsCapturedAsExtensionData()
    {
        var request = new CustomerWriteRequest
        {
            NomeFantasia = "Cliente",
            Tipo = "PF",
            Ativo = true,
            Extra = new Dictionary<string, System.Text.Json.JsonElement>
            {
                ["idEmpresa"] = System.Text.Json.JsonDocument.Parse("\"external\"").RootElement.Clone()
            }
        };

        Assert.Equal("VALIDATION_ERROR", Assert.Throws<DomainException>(() => CustomerInput.Validate(request)).Code);
    }

    [Theory]
    [InlineData("", "PF", null)]
    [InlineData("Cliente", "XX", null)]
    [InlineData("Cliente", "PF", "invalid-email")]
    public void RejectsInvalidTextFields(string name, string type, string? email)
    {
        var request = new CustomerWriteRequest { NomeFantasia = name, Tipo = type, Email = email, Ativo = true };
        Assert.Equal("VALIDATION_ERROR", Assert.Throws<DomainException>(() => CustomerInput.Validate(request)).Code);
    }

    private static CustomerWriteRequest Request(string type, string? document) => new()
    {
        NomeFantasia = " Cliente ",
        Tipo = type,
        Documento = document,
        Email = " Cliente@Example.Test ",
        Ativo = true
    };
}
