using System.Security.Claims;
using ERP.Api.Authorization;
using ERP.Application.Abstractions;
using ERP.Application.Authorization;
using Microsoft.AspNetCore.Authorization;

namespace ERP.UnitTests;

// Protege o catálogo oficial e o comportamento do handler sem depender de MariaDB.
public sealed class PermissionAuthorizationTests
{
    [Fact]
    public void Catalog_ContainsExactlySevenUniqueInitialPermissions()
    {
        var expected = new[]
        {
            Permissions.AdministracaoUsuariosVisualizar, Permissions.AdministracaoUsuariosGerenciar,
            Permissions.AdministracaoEmpresaVisualizar, Permissions.AdministracaoEmpresaEditar,
            Permissions.AdministracaoLojasVisualizar, Permissions.AdministracaoLojasGerenciar,
            Permissions.ClientesVisualizar
        };

        Assert.Equal(7, Permissions.All.Count);
        Assert.Equal(expected.Order(StringComparer.Ordinal), Permissions.All.Select(item => item.Code).Order(StringComparer.Ordinal));
        Assert.Equal(7, Permissions.All.Select(item => item.Code).Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(expected.Order(StringComparer.Ordinal), InitialProfiles.AdministratorPermissions.Order(StringComparer.Ordinal));
        Assert.Equal("ADMINISTRADOR", InitialProfiles.AdministratorNormalizedName);
    }

    [Fact]
    public async Task MissingSubject_DoesNotAuthorizeOrQueryRepository()
    {
        var resolver = new StubPermissionResolver(true);
        var requirement = new PermissionRequirement(Permissions.AdministracaoEmpresaVisualizar);
        var context = new AuthorizationHandlerContext([requirement], new ClaimsPrincipal(new ClaimsIdentity()), null);

        await new PermissionAuthorizationHandler(resolver).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.Equal(0, resolver.Calls);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, true)]
    public async Task ResolverResult_DeterminesAuthorization(bool granted, bool expected)
    {
        var resolver = new StubPermissionResolver(granted);
        var requirement = new PermissionRequirement(Permissions.AdministracaoLojasGerenciar);
        var identity = new ClaimsIdentity([new Claim("sub", "user-id")], "Bearer");
        var context = new AuthorizationHandlerContext([requirement], new ClaimsPrincipal(identity), null);

        await new PermissionAuthorizationHandler(resolver).HandleAsync(context);

        Assert.Equal(expected, context.HasSucceeded);
        Assert.Equal(1, resolver.Calls);
    }

    // Stub registra consultas para provar que a ausência de sub falha de forma fechada.
    private sealed class StubPermissionResolver(bool granted) : IPermissionResolver
    {
        public int Calls { get; private set; }
        public Task<bool> HasPermissionAsync(string userId, string permission, CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult(granted);
        }
    }
}
