using System.Text.RegularExpressions;

namespace ERP.Api.Http;

public sealed partial class RequestIdMiddleware(RequestDelegate next, ILogger<RequestIdMiddleware> logger)
{
    public const string HeaderName = "X-Request-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var supplied = context.Request.Headers[HeaderName].FirstOrDefault();
        var requestId = IsValid(supplied) ? supplied! : Guid.NewGuid().ToString("N");
        context.TraceIdentifier = requestId;
        context.Response.Headers[HeaderName] = requestId;

        using (logger.BeginScope(new Dictionary<string, object> { ["RequestId"] = requestId }))
        {
            await next(context);
        }
    }

    public static bool IsValid(string? value) =>
        value is { Length: >= 1 and <= 128 } && RequestIdPattern().IsMatch(value);

    [GeneratedRegex("^[A-Za-z0-9._:-]+$", RegexOptions.CultureInvariant)]
    private static partial Regex RequestIdPattern();
}
