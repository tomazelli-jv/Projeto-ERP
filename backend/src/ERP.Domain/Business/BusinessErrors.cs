using ERP.Domain.Errors;

namespace ERP.Domain.Business;

// Centraliza códigos estáveis das rotas de negócio para manter o mesmo formato público de erro da API.
public static class BusinessErrors
{
    // Usuários sem funcionário podem autenticar, mas não possuem escopo para consultar dados empresariais.
    public static DomainException ContextRequired() => new(
        "BUSINESS_CONTEXT_REQUIRED",
        "O usuário não possui contexto empresarial.",
        403);

    // A mesma resposta cobre empresa inexistente e empresa fora do escopo, evitando enumeração de recursos.
    public static DomainException EmpresaNotFound() => new(
        "EMPRESA_NOT_FOUND",
        "Empresa não encontrada.",
        404);

    // A mesma resposta cobre loja inexistente e loja sem vínculo com o funcionário autenticado.
    public static DomainException LojaNotFound() => new(
        "LOJA_NOT_FOUND",
        "Loja não encontrada.",
        404);
}
