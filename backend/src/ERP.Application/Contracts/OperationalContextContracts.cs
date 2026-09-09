namespace ERP.Application.Contracts;

// Contratos públicos expõem somente os identificadores necessários e dados de apresentação do contexto autenticado.
public sealed record OperationalUser(string Id, string Nome, string Email);
public sealed record OperationalCompany(string Id, string Nome, bool Ativo);
public sealed record OperationalEmployee(string Id, string Nome);
public sealed record OperationalStore(string Id, string NomeFantasia, string RazaoSocial, string Documento, string? Cidade, string? Uf, bool Ativo);
public sealed record OperationalContextResponse(OperationalUser Usuario, OperationalCompany Empresa,
    OperationalEmployee Funcionario, IReadOnlyList<OperationalStore> Lojas);

// Contexto confiável para módulos futuros é produzido somente após validação server-side do header X-Loja-Id.
public sealed record OperationalContext(string UserId, string EmployeeId, string CompanyId, string StoreId);
