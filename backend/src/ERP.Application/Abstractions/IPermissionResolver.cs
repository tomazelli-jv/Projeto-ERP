namespace ERP.Application.Abstractions;

// A API depende desta fronteira para decidir autorização sem conhecer SQL ou o schema físico do RBAC.
public interface IPermissionResolver
{
    Task<bool> HasPermissionAsync(string userId, string permission, CancellationToken cancellationToken = default);
}
