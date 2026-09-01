namespace ERP.Application.Contracts;

// Contrato público de empresa: desacopla os nomes físicos do MariaDB da representação camelCase da API.
public sealed record EmpresaResponse(string Id, string Nome, bool Ativo, DateTime DataCadastro);

// Contrato público de loja: expõe somente os campos aprovados sem aplicar formatação visual ao documento.
public sealed record LojaResponse(
    string Id,
    string IdEmpresa,
    string RazaoSocial,
    string NomeFantasia,
    string Documento,
    string? Telefone,
    string? Email,
    string? Cep,
    string? Rua,
    string? Numero,
    string? Complemento,
    string? Bairro,
    string? Cidade,
    string? Uf,
    bool Ativo,
    DateTime DataCadastro);
