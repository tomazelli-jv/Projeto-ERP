namespace ERP.Application.Contracts;

// Read contracts intentionally omit company ids and all internal persistence details.
public sealed record CustomerStore(string IdLoja, string NomeFantasia);
public sealed record CustomerSummary(string IdCliente, string NomeFantasia, string? RazaoSocial, string Tipo,
    string? Documento, string? Telefone, string? Email, bool Ativo, CustomerStore LojaCadastro, DateTime DataCadastro);
public sealed record CustomerDetail(string IdCliente, string NomeFantasia, string? RazaoSocial, string Tipo,
    string? Documento, string? Telefone, string? Email, string? Cep, string? Cidade, string? Rua, string? Uf,
    bool Ativo, CustomerStore LojaCadastro, DateTime DataCadastro);
public sealed record PaginationResponse(int Page, int PageSize, long TotalItems, int TotalPages);
public sealed record CustomerPage(IReadOnlyList<CustomerSummary> Data, PaginationResponse Pagination);

// Nullable query members preserve the distinction between omitted filters and explicit values.
public sealed class CustomerListQuery
{
    public int? Page { get; init; }
    public int? PageSize { get; init; }
    public string? Search { get; init; }
    public string? Tipo { get; init; }
    public bool? Ativo { get; init; }
}
