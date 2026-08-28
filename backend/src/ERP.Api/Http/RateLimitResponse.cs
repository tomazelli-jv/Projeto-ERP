using Microsoft.AspNetCore.RateLimiting;

namespace ERP.Api.Http;

public static class RateLimitResponse
{
    public static ValueTask WriteAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        return new ValueTask(rejected.HttpContext.Response.WriteAsJsonAsync(
            new ApiErrorResponse(new ApiError(
                "RATE_LIMIT_EXCEEDED",
                "Muitas solicitações. Tente novamente mais tarde.",
                rejected.HttpContext.TraceIdentifier)),
            cancellationToken));
    }
}
