using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Brazil;
using ERP.Domain.Business;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;

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

    // '=' is the explicit SQL escape character, so user wildcards remain literal and parameters remain injection-safe.
    private static string EscapeLike(string value) => value.Replace("=", "==").Replace("%", "=%").Replace("_", "=_");
    private static CustomerStore Store(CustomerRow row) => new(row.IdLoja, row.LojaNomeFantasia);
    private static CustomerSummary ToSummary(CustomerRow row) => new(row.IdCliente, row.NomeFantasia, row.RazaoSocial, row.Tipo, row.Documento, row.Telefone, row.Email, row.Ativo, Store(row), row.DataCadastro);
    private static CustomerDetail ToDetail(CustomerRow row) => new(row.IdCliente, row.NomeFantasia, row.RazaoSocial, row.Tipo, row.Documento, row.Telefone, row.Email, row.Cep, row.Cidade, row.Rua, row.Uf, row.Ativo, Store(row), row.DataCadastro);
}
