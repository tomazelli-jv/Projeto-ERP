using ERP.Domain.Errors;

namespace ERP.Domain.Business;

// Centraliza códigos estáveis das rotas de negócio para manter o mesmo formato público de erro da API.
public static class BusinessErrors
{
    // Payloads inválidos usam o formato comum do GlobalExceptionHandler e nunca chegam ao MariaDB.
    public static DomainException Validation(string message) => new("VALIDATION_ERROR", message, 400);

    // Usuários sem funcionário podem autenticar, mas não possuem escopo para consultar dados empresariais.
    public static DomainException ContextRequired() => new(
        "BUSINESS_CONTEXT_REQUIRED",
        "O usuário não possui contexto empresarial.",
        403);

    // Empresa inativa mantém autenticação disponível, mas impede a criação de contexto operacional.
    public static DomainException BusinessInactive() => new("BUSINESS_INACTIVE", "A empresa vinculada está inativa.", 403);

    // Header ausente ou malformado falha antes de qualquer consulta por loja informada pelo cliente.
    public static DomainException StoreContextRequired() => new("STORE_CONTEXT_REQUIRED", "Selecione uma loja ativa para continuar.", 400);

    // Loja inexistente, externa ou sem vínculo compartilha 404 para impedir enumeração entre empresas.
    public static DomainException StoreContextNotFound() => new("STORE_NOT_FOUND", "Loja não encontrada ou não permitida.", 404);

    // Loja vinculada porém inativa possui erro próprio porque sua existência já é conhecida no contexto do usuário.
    public static DomainException StoreInactive() => new("STORE_INACTIVE", "A loja selecionada está inativa.", 403);

    // A mesma resposta cobre empresa inexistente e empresa fora do escopo, evitando enumeração de recursos.
    public static DomainException EmpresaNotFound() => new(
        "EMPRESA_NOT_FOUND",
        "Empresa não encontrada.",
        404);

    // O baseline ainda não possui uma autoridade global capaz de criar a primeira empresa com segurança.
    public static DomainException EmpresaCreationForbidden() => new(
        "EMPRESA_CREATION_FORBIDDEN",
        "O usuário não possui autorização para criar empresas.",
        403);

    // A mesma resposta cobre loja inexistente e loja sem vínculo com o funcionário autenticado.
    public static DomainException LojaNotFound() => new(
        "LOJA_NOT_FOUND",
        "Loja não encontrada.",
        404);

    // A unicidade global do documento é traduzida sem expor texto ou detalhes internos do MariaDB.
    public static DomainException LojaDocumentoAlreadyExists() => new(
        "LOJA_DOCUMENTO_ALREADY_EXISTS",
        "Já existe uma loja com este documento.",
        409);

    // Ausência e acesso cross-company compartilham 404 para não revelar a existência de outro cliente.
    public static DomainException CustomerNotFound() => new("CLIENTE_NOT_FOUND", "Cliente não encontrado.", 404);
}
