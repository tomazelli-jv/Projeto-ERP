using System.Security.Claims;
using ERP.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using ERP.Application.Authorization;

namespace ERP.Api.Authorization;

// Atributo mantém controllers declarativas e centraliza o prefixo reservado para policies de permissão.
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "Permission:";
    public RequirePermissionAttribute(string permission)
    {
        Permission = permission;
        Policy = PolicyPrefix + permission;
    }

    public string Permission { get; }
}

// Requirement carrega somente o código centralizado; a consulta pertence ao resolver de infraestrutura.
public sealed record PermissionRequirement(string Permission) : IAuthorizationRequirement;

// Provider cria policies sob demanda para evitar registrar manualmente uma policy para cada constante.
public sealed class PermissionPolicyProvider(IOptions<AuthorizationOptions> options) : DefaultAuthorizationPolicyProvider(options)
{
    public override Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(RequirePermissionAttribute.PolicyPrefix, StringComparison.Ordinal))
            return base.GetPolicyAsync(policyName);
        var permission = policyName[RequirePermissionAttribute.PolicyPrefix.Length..];
        // Uma policy desconhecida não é criada, impedindo erros de digitação de se tornarem requisitos silenciosos.
        if (!Permissions.All.Any(item => item.Code == permission)) return Task.FromResult<AuthorizationPolicy?>(null);
        var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(permission)).Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}

// Handler exige sub e consulta o banco; ausência de identidade ou permissão simplesmente não satisfaz o requisito.
public sealed class PermissionAuthorizationHandler(IPermissionResolver permissions) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var userId = context.User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userId)) return;
        // O cancelamento da requisição é propagado para interromper prontamente a consulta MariaDB.
        var cancellationToken = (context.Resource as HttpContext)?.RequestAborted ?? CancellationToken.None;
        if (await permissions.HasPermissionAsync(userId, requirement.Permission, cancellationToken)) context.Succeed(requirement);
    }
}
