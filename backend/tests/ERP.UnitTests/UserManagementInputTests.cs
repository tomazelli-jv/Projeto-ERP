using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Application;

namespace ERP.UnitTests;

// Testes protegem normalização e payload estrito sem depender do banco ou enfraquecer a política compartilhada.
public sealed class UserManagementInputTests
{
    [Fact]
    public void Creation_NormalizesIdentityAndDeduplicatesNothingSilently()
    {
        var profile = Guid.NewGuid().ToString();
        var store = Guid.NewGuid().ToString();
        var result = UserManagementInput.Validate(new CreateUserEmployeeRequest
        {
            UserName = " maria.souza ",
            Email = " MARIA@EXAMPLE.COM ",
            Password = "uma frase senha segura",
            NomeFuncionario = " Maria Souza ",
            Ativo = true,
            IdPerfil = profile,
            IdsLojas = [store]
        });

        Assert.Equal("maria.souza", result.UserName);
        Assert.Equal("maria@example.com", result.Email);
        Assert.Equal("Maria Souza", result.EmployeeName);
        Assert.Equal(store, Assert.Single(result.StoreIds));
    }

    [Fact]
    public void Creation_RejectsUnknownPropertiesAndWeakPassword()
    {
        var request = new CreateUserEmployeeRequest
        {
            UserName = "maria",
            Email = "maria@example.com",
            Password = "curta",
            NomeFuncionario = "Maria",
            Ativo = true,
            IdPerfil = Guid.NewGuid().ToString(),
            IdsLojas = [],
            Extra = new Dictionary<string, System.Text.Json.JsonElement> { ["idEmpresa"] = default }
        };

        var error = Assert.Throws<DomainException>(() => UserManagementInput.Validate(request));
        Assert.Equal("VALIDATION_ERROR", error.Code);
    }

    [Fact]
    public void Stores_RejectDuplicateOrInvalidIdentifiers()
    {
        var id = Guid.NewGuid().ToString();
        Assert.Throws<DomainException>(() => UserManagementInput.ValidateStores(new UpdateManagedStoresRequest { IdsLojas = [id, id] }));
        Assert.Throws<DomainException>(() => UserManagementInput.ValidateStores(new UpdateManagedStoresRequest { IdsLojas = ["not-an-id"] }));
    }
}
