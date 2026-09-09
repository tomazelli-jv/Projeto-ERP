using System.Security.Claims;
using ERP.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Contexto operacional exige somente autenticação; descobrir o próprio vínculo não é permissão administrativa.
[ApiController, Authorize, Route("api/v1/contexto")]
public sealed class OperationalContextController(IOperationalContextResolver context) : ControllerBase
{
    // Resposta é sempre reconstruída do banco para refletir remoções de acesso e inativações.
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken token) =>
        Ok(new { data = await context.GetAsync(User.FindFirstValue("sub")!, token) });
}
