namespace ERP.Api.Http;

public sealed record ApiError(string Code, string Message, string RequestId);

public sealed record ApiErrorResponse(ApiError Error);
