using System.Security.Claims;
using System.Text.Encodings.Web;
using ERP.Application.Abstractions;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using ERP.Domain.Errors;

namespace ERP.Api.Http;

public sealed class BearerAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IAccessTokenService tokens,
    ERP.Infrastructure.Application.AuthenticationService authentication) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return AuthenticateResult.NoResult();
        try
        {
            var identity = tokens.Validate(authorization[7..].Trim(), DateTime.UtcNow);
            if (!await authentication.ValidateSessionAsync(identity.UserId, identity.SessionId, Context.RequestAborted))
            { Context.Items["AuthenticationError"] = "SESSION_INVALID"; return AuthenticateResult.Fail("Inactive session"); }
            var claims = new[] { new Claim(ClaimTypes.NameIdentifier, identity.UserId), new Claim("sub", identity.UserId), new Claim("sid", identity.SessionId), new Claim("jti", identity.TokenId) };
            return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name));
        }
        catch (DomainException exception) { Context.Items["AuthenticationError"] = exception.Code; return AuthenticateResult.Fail("Invalid access token"); }
        catch { Context.Items["AuthenticationError"] = "ACCESS_TOKEN_INVALID"; return AuthenticateResult.Fail("Invalid access token"); }
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        var code = Context.Items["AuthenticationError"] as string ?? "AUTHENTICATION_REQUIRED";
        var message = code == "ACCESS_TOKEN_EXPIRED" ? "Token de acesso expirado." : code == "AUTHENTICATION_REQUIRED" ? "Autenticação obrigatória." : "Token de acesso ou sessão inválida.";
        await Response.WriteAsJsonAsync(new ApiErrorResponse(new ApiError(code, message, Context.TraceIdentifier)));
    }
}
