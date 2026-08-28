using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/v1/auth/password/setup")]
[Consumes("application/json")]
[RequestSizeLimit(16_384)]
public sealed class PasswordSetupController(PasswordSetupService service) : ControllerBase
{
    [HttpPost("confirm")]
    [EnableRateLimiting("password-setup")]
    public async Task<IActionResult> Confirm([FromBody] PasswordSetupConfirmRequest request, CancellationToken cancellationToken) =>
        Ok(new { data = await service.ExecuteAsync(request, cancellationToken) });
}
