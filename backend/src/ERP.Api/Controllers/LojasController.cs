using System.Security.Claims;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Expõe a consulta individual de loja sem incorporar SQL ou regras de vínculo na camada HTTP.
[ApiController]
[Authorize]
[Route("api/v1/lojas")]
public sealed class LojasController(EmpresaService empresas) : ControllerBase
{
    // GET /api/v1/lojas/{idLoja} retorna 404 quando a loja não existe ou não está vinculada ao funcionário.
    [HttpGet("{idLoja:guid}")]
    public async Task<IActionResult> Find(string idLoja, CancellationToken token) =>
        Ok(new { data = await empresas.FindLojaAsync(User.FindFirstValue("sub")!, idLoja, token) });
}
