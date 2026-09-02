using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

namespace ERP.Api.Http;

public static class RateLimitResponse
{
    public static ValueTask WriteAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        if (rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            rejected.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
        return new ValueTask(rejected.HttpContext.Response.WriteAsJsonAsync(
            new ApiErrorResponse(new ApiError(
                "RATE_LIMIT_EXCEEDED",
                "Muitas solicitações. Tente novamente mais tarde.",
                rejected.HttpContext.TraceIdentifier)),
            cancellationToken));
    }
}
