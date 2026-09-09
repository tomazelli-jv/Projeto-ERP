using ERP.Application.Contracts;

namespace ERP.Application.Abstractions;

// Fronteira evita repetir a validação de loja em cada módulo operacional futuro.
public interface IOperationalContextResolver
{
    Task<OperationalContextResponse> GetAsync(string userId, CancellationToken cancellationToken = default);
    Task<OperationalContext> ResolveRequiredStoreAsync(string userId, string? storeId, CancellationToken cancellationToken = default);
}
