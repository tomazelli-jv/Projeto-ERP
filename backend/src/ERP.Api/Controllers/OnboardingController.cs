using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/v1/onboarding")]
[Consumes("application/json")]
[RequestSizeLimit(65_536)]
public sealed class OnboardingController(OnboardingService service) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] OnboardingRequest request, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, new { data = await service.ExecuteAsync(request, cancellationToken) });
}
