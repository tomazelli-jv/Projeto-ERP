using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Brazil;
using ERP.Domain.Business;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.Infrastructure.Application;

public sealed class CustomerService(IMariaDbConnectionFactory connections, IOperationalContextResolver contexts, CustomerRepository repository)
{
    // Store resolution authenticates the operational entry point; customer visibility deliberately remains company-wide.
    public async Task<CustomerPage> ListAsync(string userId, string? storeId, CustomerListQuery query, CancellationToken token)
    {
        var context = await contexts.ResolveRequiredStoreAsync(userId, storeId, token);
        var page = query.Page ?? 1; var pageSize = query.PageSize ?? 20;
        if (page < 1 || pageSize is < 1 or > 100) throw BusinessErrors.Validation("Paginação inválida.");
        var type = query.Tipo?.Trim().ToUpperInvariant();
        if (type is not null and not ("PF" or "PJ")) throw BusinessErrors.Validation("Tipo de cliente inválido.");
        var rawSearch = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();
        if (rawSearch?.Length > 180) throw BusinessErrors.Validation("Busca inválida.");
        var search = rawSearch is null ? null : $"%{EscapeLike(rawSearch)}%";
        var document = rawSearch is not null && Cnpj.TryNormalize(rawSearch, out var normalized) ? $"%{EscapeLike(normalized)}%" : null;
        await using var connection = await connections.OpenConnectionAsync(token);
        var result = await repository.ListAsync(connection, context.CompanyId, (page - 1) * pageSize, pageSize, search, document, type, query.Ativo, token);
        return new(result.Items.Select(ToSummary).ToArray(), new(page, pageSize, result.Total, (int)Math.Ceiling(result.Total / (double)pageSize)));
    }

    public async Task<CustomerDetail> FindAsync(string userId, string? storeId, string customerId, CancellationToken token)
    {
        var context = await contexts.ResolveRequiredStoreAsync(userId, storeId, token);
        await using var connection = await connections.OpenConnectionAsync(token);
        var row = await repository.FindAsync(connection, context.CompanyId, customerId, token) ?? throw BusinessErrors.CustomerNotFound();
        return ToDetail(row);
    }

    // Company and registration store always come from the authoritative operational context.
    public async Task<CustomerDetail> CreateAsync(string userId, string? storeId, CustomerWriteRequest? request, CancellationToken token)
    {
        var context = await contexts.ResolveRequiredStoreAsync(userId, storeId, token);
        var input = CustomerInput.Validate(request); var id = Guid.NewGuid().ToString();
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            if (await repository.CreateAsync(connection, transaction, id, context.CompanyId, context.StoreId, input, token) != 1) throw new InvalidOperationException("Customer insert affected an unexpected number of rows.");
            var row = await repository.FindForUpdateAsync(connection, transaction, context.CompanyId, id, token) ?? throw new InvalidOperationException("Created customer could not be read.");
            await transaction.CommitAsync(token); return ToDetail(row);
        }
        catch (MySqlException exception) when (IsDocumentConflict(exception)) { await transaction.RollbackAsync(CancellationToken.None); throw BusinessErrors.CustomerDocumentExists(); }
        catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    // The existing row is locked before update; id_loja_cadastro is never part of the mutable input or SQL SET list.
    public async Task<CustomerDetail> UpdateAsync(string userId, string? storeId, string customerId, CustomerWriteRequest? request, CancellationToken token)
    {
        var context = await contexts.ResolveRequiredStoreAsync(userId, storeId, token);
        var input = CustomerInput.Validate(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            _ = await repository.FindForUpdateAsync(connection, transaction, context.CompanyId, customerId, token) ?? throw BusinessErrors.CustomerNotFound();
            await repository.UpdateAsync(connection, transaction, context.CompanyId, customerId, input, token);
            var row = await repository.FindForUpdateAsync(connection, transaction, context.CompanyId, customerId, token) ?? throw BusinessErrors.CustomerNotFound();
            await transaction.CommitAsync(token); return ToDetail(row);
        }
        catch (MySqlException exception) when (IsDocumentConflict(exception)) { await transaction.RollbackAsync(CancellationToken.None); throw BusinessErrors.CustomerDocumentExists(); }
        catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    // '=' is the explicit SQL escape character, so user wildcards remain literal and parameters remain injection-safe.
    private static string EscapeLike(string value) => value.Replace("=", "==").Replace("%", "=%").Replace("_", "=_");
    private static CustomerStore Store(CustomerRow row) => new(row.IdLoja, row.LojaNomeFantasia);
    private static CustomerSummary ToSummary(CustomerRow row) => new(row.IdCliente, row.NomeFantasia, row.RazaoSocial, row.Tipo, row.Documento, row.Telefone, row.Email, row.Ativo, Store(row), row.DataCadastro);
    private static CustomerDetail ToDetail(CustomerRow row) => new(row.IdCliente, row.NomeFantasia, row.RazaoSocial, row.Tipo, row.Documento, row.Telefone, row.Email, row.Cep, row.Cidade, row.Rua, row.Uf, row.Ativo, Store(row), row.DataCadastro);
    private static bool IsDocumentConflict(MySqlException exception) => exception.Number == 1062 && exception.Message.Contains("uq_cliente_empresa_documento", StringComparison.OrdinalIgnoreCase);
}
