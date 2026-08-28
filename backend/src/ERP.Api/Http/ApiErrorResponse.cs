namespace ERP.Api.Http;

public sealed record ApiError(string Code, string Message, string RequestId, object? Details = null);

public sealed record ApiErrorResponse(ApiError Error);
