using ERP.Domain.Errors;

namespace ERP.Domain.Security;

public static class AuthenticationErrors
{
    public static DomainException InvalidCredentials() => new("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", 401);
    public static DomainException Required() => new("AUTHENTICATION_REQUIRED", "Autenticação obrigatória.", 401);
    public static DomainException AccessInvalid() => new("ACCESS_TOKEN_INVALID", "Token de acesso inválido.", 401);
    public static DomainException AccessExpired() => new("ACCESS_TOKEN_EXPIRED", "Token de acesso expirado.", 401);
    public static DomainException RefreshInvalid() => new("REFRESH_TOKEN_INVALID", "Sessão inválida.", 401);
    public static DomainException RefreshExpired() => new("REFRESH_TOKEN_EXPIRED", "Sessão expirada.", 401);
    public static DomainException RefreshReused() => new("REFRESH_TOKEN_REUSED", "Sessão inválida.", 401);
    public static DomainException SessionInvalid() => new("SESSION_INVALID", "Sessão inválida.", 401);
    public static DomainException SessionExpired() => new("SESSION_EXPIRED", "Sessão expirada.", 401);
    public static DomainException SessionRevoked() => new("SESSION_REVOKED", "Sessão revogada.", 401);
    public static DomainException TemporarilyBlocked() => new("LOGIN_TEMPORARILY_BLOCKED", "Não foi possível autenticar. Tente novamente mais tarde.", 429);
}
