using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Business;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;

namespace ERP.Infrastructure.Application;

// Serviço é stateless: seleciona e valida contexto sem persistir loja ativa no banco.
public sealed class OperationalContextService(IMariaDbConnectionFactory connections, OperationalContextRepository repository)
    : IOperationalContextResolver
{
    // Endpoint de descoberta funciona para qualquer autenticado e retorna lista vazia quando não há lojas.
    public async Task<OperationalContextResponse> GetAsync(string userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        var identity = await RequiredIdentityAsync(connection, userId, cancellationToken);
        var stores = await repository.ListStoresAsync(connection, identity.EmployeeId, identity.CompanyId, cancellationToken);
        return new(new(identity.UserId, identity.UserName, identity.Email),
            new(identity.CompanyId, identity.CompanyName, identity.CompanyActive),
            new(identity.EmployeeId, identity.EmployeeName),
            stores.Select(ToContract).ToArray());
    }

    // Futuras APIs store-scoped chamarão esta operação após ler X-Loja-Id; nenhuma rota administrativa é afetada.
    public async Task<OperationalContext> ResolveRequiredStoreAsync(string userId, string? storeId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(storeId, out var parsed)) throw BusinessErrors.StoreContextRequired();
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        var identity = await RequiredIdentityAsync(connection, userId, cancellationToken);
        var store = await repository.FindLinkedStoreAsync(connection, identity.EmployeeId, identity.CompanyId, parsed.ToString(), cancellationToken)
            ?? throw BusinessErrors.StoreContextNotFound();
        if (!store.Ativo) throw BusinessErrors.StoreInactive();
        return new(identity.UserId, identity.EmployeeId, identity.CompanyId, store.Id);
    }

    // Empresa é sempre derivada do funcionário autenticado e deve estar ativa para qualquer contexto operacional.
    private async Task<OperationalIdentityRow> RequiredIdentityAsync(MySqlConnector.MySqlConnection connection, string userId, CancellationToken token)
    {
        var identity = await repository.FindIdentityAsync(connection, userId, token) ?? throw BusinessErrors.ContextRequired();
        if (!identity.CompanyActive) throw BusinessErrors.BusinessInactive();
        return identity;
    }

    private static OperationalStore ToContract(OperationalStoreRow store) =>
        new(store.Id, store.NomeFantasia, store.RazaoSocial, store.Documento, store.Cidade, store.Uf, store.Ativo);
}
