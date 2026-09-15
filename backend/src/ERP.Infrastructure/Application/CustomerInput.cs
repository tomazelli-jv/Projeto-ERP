using System.Net.Mail;
using ERP.Application.Contracts;
using ERP.Domain.Brazil;
using ERP.Domain.Business;

namespace ERP.Infrastructure.Application;

public sealed record CustomerWrite(string NomeFantasia, string? RazaoSocial, string Tipo, string? Documento,
    string? Telefone, string? Email, string? Cep, string? Cidade, string? Rua, string? Uf, bool Ativo);

public static class CustomerInput
{
    // Validation normalizes the document before persistence so the company-scoped UNIQUE has canonical values.
    public static CustomerWrite Validate(CustomerWriteRequest? request)
    {
        if (request is null || request.Extra is { Count: > 0 } || request.Ativo is null) throw BusinessErrors.Validation("Dados do cliente inválidos.");
        var type = request.Tipo?.Trim().ToUpperInvariant();
        if (type is not ("PF" or "PJ")) throw BusinessErrors.Validation("Tipo de cliente inválido.");
        var document = NormalizeDocument(type, request.Documento);
        var email = Optional(request.Email, 254, "email")?.ToLowerInvariant();
        if (email is not null && (!MailAddress.TryCreate(email, out var parsed) || !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))) throw BusinessErrors.Validation("Informe um e-mail válido.");
        var cep = Optional(request.Cep, 8, "cep");
        if (cep is not null && (cep.Length != 8 || cep.Any(c => c is < '0' or > '9'))) throw BusinessErrors.Validation("CEP inválido.");
        var uf = Optional(request.Uf, 2, "uf")?.ToUpperInvariant();
        if (uf is not null && (uf.Length != 2 || uf.Any(c => c is < 'A' or > 'Z'))) throw BusinessErrors.Validation("UF inválida.");
        return new(Required(request.NomeFantasia, 180), Optional(request.RazaoSocial, 180, "razaoSocial"), type, document,
            Optional(request.Telefone, 20, "telefone"), email, cep, Optional(request.Cidade, 120, "cidade"), Optional(request.Rua, 180, "rua"), uf, request.Ativo.Value);
    }

    // Empty documents remain null; populated values must satisfy the complete algorithm for their declared type.
    private static string? NormalizeDocument(string type, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (type == "PF" && Cpf.TryNormalize(value, out var cpf) && Cpf.IsValid(cpf)) return cpf;
        if (type == "PJ" && Cnpj.TryNormalize(value, out var cnpj) && Cnpj.IsValid(cnpj)) return cnpj;
        throw BusinessErrors.Validation(type == "PF" ? "CPF inválido." : "CNPJ inválido.");
    }

    private static string Required(string? value, int max) => !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= max ? value.Trim() : throw BusinessErrors.Validation("Nome do cliente inválido.");
    private static string? Optional(string? value, int max, string field)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        if (normalized?.Length > max) throw BusinessErrors.Validation($"Campo {field} excede o limite permitido.");
        return normalized;
    }
}
