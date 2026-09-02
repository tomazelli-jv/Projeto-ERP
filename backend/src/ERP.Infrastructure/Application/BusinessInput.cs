using System.Net.Mail;
using ERP.Application.Contracts;
using ERP.Domain.Business;

namespace ERP.Infrastructure.Application;

// Normaliza somente espaços permitidos e valida todos os limites antes de qualquer operação de escrita.
public static class BusinessInput
{
    // Empresa aceita exclusivamente nome não vazio e estado booleano explícito.
    public static (string Nome, bool Ativo) ValidateEmpresa(UpdateEmpresaRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || request.Ativo is null)
            throw BusinessErrors.Validation("Os dados informados são inválidos.");
        return (Required(request.Nome, 160, "nome"), request.Ativo.Value);
    }

    // O contrato de criação usa as mesmas regras, embora a autorização global ainda bloqueie sua persistência.
    public static (string Nome, bool Ativo) ValidateEmpresa(CreateEmpresaRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || request.Ativo is null)
            throw BusinessErrors.Validation("Os dados informados são inválidos.");
        return (Required(request.Nome, 160, "nome"), request.Ativo.Value);
    }

    // Loja exige documento/UF estritos e preserva campos opcionais após trim, sem conversões silenciosas.
    public static LojaWrite ValidateLoja(LojaWriteRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || request.Ativo is null)
            throw BusinessErrors.Validation("Os dados informados são inválidos.");
        var documento = Required(request.Documento, 14, "documento");
        if (documento.Length != 14 || documento.Any(character => character is < '0' or > '9'))
            throw BusinessErrors.Validation("O documento deve possuir exatamente 14 dígitos.");
        var email = Optional(request.Email, 254, "email");
        if (email is not null && (email.Length == 0 || !MailAddress.TryCreate(email, out var parsed) || !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase)))
            throw BusinessErrors.Validation("Informe um e-mail válido.");
        var cep = Optional(request.Cep, 8, "cep");
        if (cep is not null && (cep.Length != 8 || cep.Any(character => character is < '0' or > '9')))
            throw BusinessErrors.Validation("O CEP deve possuir exatamente 8 dígitos.");
        var uf = Optional(request.Uf, 2, "uf");
        if (uf is not null && (uf.Length != 2 || uf.Any(character => character is < 'A' or > 'Z')))
            throw BusinessErrors.Validation("A UF deve possuir exatamente duas letras maiúsculas.");
        return new(Required(request.RazaoSocial, 180, "razaoSocial"), Required(request.NomeFantasia, 180, "nomeFantasia"),
            documento, Optional(request.Telefone, 20, "telefone"), email, cep, Optional(request.Rua, 180, "rua"),
            Optional(request.Numero, 30, "numero"), Optional(request.Complemento, 120, "complemento"),
            Optional(request.Bairro, 120, "bairro"), Optional(request.Cidade, 120, "cidade"), uf, request.Ativo.Value);
    }

    // Campos obrigatórios são aparados, mas nunca truncados ou preenchidos implicitamente.
    private static string Required(string? value, int maximum, string field)
    {
        var normalized = value?.Trim() ?? "";
        if (normalized.Length == 0 || normalized.Length > maximum)
            throw BusinessErrors.Validation($"O campo {field} é obrigatório e deve possuir no máximo {maximum} caracteres.");
        return normalized;
    }

    // Campos opcionais preservam null e aplicam apenas trim e limite contratual.
    private static string? Optional(string? value, int maximum, string field)
    {
        if (value is null) return null;
        var normalized = value.Trim();
        if (normalized.Length > maximum)
            throw BusinessErrors.Validation($"O campo {field} deve possuir no máximo {maximum} caracteres.");
        return normalized;
    }
}

// Valor validado usado internamente pelo service e repository, sem dependência do payload HTTP.
public sealed record LojaWrite(string RazaoSocial, string NomeFantasia, string Documento, string? Telefone,
    string? Email, string? Cep, string? Rua, string? Numero, string? Complemento, string? Bairro,
    string? Cidade, string? Uf, bool Ativo);
