using ERP.Domain.Errors;

namespace ERP.Domain.Business;

// Códigos estáveis evitam revelar se uma identidade pertence a outra empresa e traduzem conflitos conhecidos.
public static class UserManagementErrors
{
    public static DomainException UserNotFound() => new("USUARIO_NOT_FOUND", "Usuário não encontrado.", 404);
    public static DomainException EmployeeNotFound() => new("FUNCIONARIO_NOT_FOUND", "Funcionário não encontrado.", 404);
    public static DomainException EmailExists() => new("USUARIO_EMAIL_ALREADY_EXISTS", "Já existe um usuário com este e-mail.", 409);
    public static DomainException UserNameExists() => new("USUARIO_USERNAME_ALREADY_EXISTS", "Já existe um usuário com este nome de usuário.", 409);
    public static DomainException ProfileNotFound() => new("PERFIL_NOT_FOUND", "Perfil não encontrado.", 404);
    public static DomainException StoreOutsideContext() => new("LOJA_OUTSIDE_BUSINESS_CONTEXT", "Uma ou mais lojas não pertencem à empresa ou estão indisponíveis.", 404);
    public static DomainException SelfDeactivationForbidden() => new("SELF_DEACTIVATION_FORBIDDEN", "Você não pode inativar sua própria conta.", 403);
    public static DomainException LastAdministratorRequired() => new("LAST_ADMINISTRATOR_REQUIRED", "A empresa precisa manter pelo menos um administrador ativo.", 409);
}
