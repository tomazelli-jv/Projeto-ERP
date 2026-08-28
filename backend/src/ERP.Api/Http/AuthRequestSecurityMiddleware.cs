namespace ERP.Api.Http;

public sealed class AuthRequestSecurityMiddleware(RequestDelegate next, IConfiguration configuration)
{
    private readonly HashSet<string> _origins = (configuration.GetSection("Web:Origins").Get<string[]>() ?? []).ToHashSet(StringComparer.OrdinalIgnoreCase);

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api/v1/auth") && HttpMethods.IsPost(context.Request.Method))
        {
            var path = context.Request.Path.Value;
            if (context.Request.ContentLength > 16_384) { context.Response.StatusCode = 413; return; }
            if (path == "/api/v1/auth/login" && !context.Request.HasJsonContentType()) { context.Response.StatusCode = 415; return; }
            if (context.Request.Cookies.Count > 0 || path is "/api/v1/auth/refresh" or "/api/v1/auth/logout")
            {
                var origin = context.Request.Headers.Origin.ToString();
                if (string.IsNullOrWhiteSpace(origin) || !_origins.Contains(origin)) { context.Response.StatusCode = 403; return; }
            }
        }
        await next(context);
    }
}
