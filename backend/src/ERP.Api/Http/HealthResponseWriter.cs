using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ERP.Api.Http;

public static class HealthResponseWriter
{
    public static Task WriteAsync(HttpContext context, HealthReport report)
    {
        if (report.Status == HealthStatus.Healthy)
        {
            return context.Response.WriteAsJsonAsync(new { status = "ok" });
        }

        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        return context.Response.WriteAsJsonAsync(new ApiErrorResponse(new ApiError(
            "SERVICE_NOT_READY",
            "Uma dependência essencial não está disponível.",
            context.TraceIdentifier)));
    }
}
