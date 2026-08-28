using ERP.Api.Http;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
public sealed class ErrorsController : ControllerBase
{
    [Route("/{**path}", Order = int.MaxValue)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public IActionResult NotFoundRoute()
    {
        return NotFound(new ApiErrorResponse(new ApiError(
            "ROUTE_NOT_FOUND",
            "Rota não encontrada.",
            HttpContext.TraceIdentifier)));
    }
}
