using Microsoft.AspNetCore.Diagnostics;

namespace ERP.Api.Http;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled request failure with request id {RequestId}", context.TraceIdentifier);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(
            new ApiErrorResponse(new ApiError(
                "INTERNAL_SERVER_ERROR",
                "Ocorreu um erro interno.",
                context.TraceIdentifier)),
            cancellationToken);
        return true;
    }
}
