using Microsoft.AspNetCore.Diagnostics;
using ERP.Domain.Errors;

namespace ERP.Api.Http;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var domain = exception as DomainException;
        var publicDomain = ToPublic(domain);
        if (domain is null)
            logger.LogError(exception, "Unhandled request failure with request id {RequestId}", context.TraceIdentifier);
        else
            logger.LogWarning("Request rejected with domain code {ErrorCode} and request id {RequestId}", domain.Code, context.TraceIdentifier);
        context.Response.StatusCode = publicDomain?.StatusCode ?? StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(
            new ApiErrorResponse(new ApiError(
                publicDomain?.Code ?? "INTERNAL_SERVER_ERROR",
                publicDomain?.Message ?? "Ocorreu um erro interno.",
                context.TraceIdentifier)),
            cancellationToken);
        return true;
    }

    private static DomainException? ToPublic(DomainException? exception)
    {
        if (exception is null) return null;
        return exception.Code is "PASSWORD_SETUP_TOKEN_EXPIRED" or "PASSWORD_SETUP_TOKEN_ALREADY_USED" or
            "PASSWORD_SETUP_TOKEN_REVOKED" or "PASSWORD_SETUP_TOKEN_PURPOSE_INVALID"
            ? new DomainException("PASSWORD_SETUP_TOKEN_INVALID", "Não foi possível validar o link de definição de senha.", 422)
            : exception;
    }
}
