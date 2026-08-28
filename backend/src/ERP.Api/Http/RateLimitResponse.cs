using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

namespace ERP.Api.Http;

public static class RateLimitResponse
{
    public static ValueTask WriteAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        if (rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            rejected.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
        var passwordSetup = rejected.HttpContext.Request.Path.StartsWithSegments("/api/v1/auth/password/setup");
        return new ValueTask(rejected.HttpContext.Response.WriteAsJsonAsync(
            new ApiErrorResponse(new ApiError(
                "RATE_LIMIT_EXCEEDED",
                passwordSetup ? "Muitas tentativas. Aguarde antes de tentar novamente." : "Muitas solicitações. Tente novamente mais tarde.",
                rejected.HttpContext.TraceIdentifier)),
            cancellationToken));
    }
}
