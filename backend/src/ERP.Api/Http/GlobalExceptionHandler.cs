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
        if (domain is null)
            logger.LogError(exception, "Unhandled request failure with request id {RequestId}", context.TraceIdentifier);
        else
            logger.LogWarning("Request rejected with domain code {ErrorCode} and request id {RequestId}", domain.Code, context.TraceIdentifier);
        context.Response.StatusCode = domain?.StatusCode ?? StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(
            new ApiErrorResponse(new ApiError(
                domain?.Code ?? "INTERNAL_SERVER_ERROR",
                domain?.Message ?? "Ocorreu um erro interno.",
                context.TraceIdentifier)),
            cancellationToken);
        return true;
    }
}
