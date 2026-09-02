namespace ERP.Application.Contracts;

using System.Text.Json;
using System.Text.Json.Serialization;

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

// Solicitação de criação de empresa mantida separada da resposta; a operação permanece bloqueada até existir autoridade global confiável.
public sealed class CreateEmpresaRequest
{
    public string? Nome { get; init; }
    public bool? Ativo { get; init; }
    // Campos desconhecidos são capturados para impedir mass assignment silencioso.
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

// Atualização de empresa permite somente nome e estado, preservando id e data de cadastro.
public sealed class UpdateEmpresaRequest
{
    public string? Nome { get; init; }
    public bool? Ativo { get; init; }
    // A validação rejeita propriedades fora do contrato aprovado.
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

// Campos graváveis de loja são explícitos para que id, empresa e data de cadastro nunca venham do cliente.
public class LojaWriteRequest
{
    public string? RazaoSocial { get; init; }
    public string? NomeFantasia { get; init; }
    public string? Documento { get; init; }
    public string? Telefone { get; init; }
    public string? Email { get; init; }
    public string? Cep { get; init; }
    public string? Rua { get; init; }
    public string? Numero { get; init; }
    public string? Complemento { get; init; }
    public string? Bairro { get; init; }
    public string? Cidade { get; init; }
    public string? Uf { get; init; }
    public bool? Ativo { get; init; }
    // Campos desconhecidos tornam o payload inválido em vez de serem ignorados.
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

// Tipo próprio documenta a intenção de criar uma loja sem reutilizar o contrato de resposta.
public sealed class CreateLojaRequest : LojaWriteRequest;

// Tipo próprio mantém evolução independente para futuras regras específicas de atualização.
public sealed class UpdateLojaRequest : LojaWriteRequest;
