using System.Security.Claims;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Expõe consultas HTTP de empresa e delega toda resolução de escopo empresarial ao service.
[ApiController]
[Authorize]
[Route("api/v1/empresas")]
public sealed class EmpresasController(EmpresaService empresas) : ControllerBase
{
    // GET /api/v1/empresas retorna uma coleção limitada à empresa do funcionário autenticado.
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken token) =>
        Ok(new { data = await empresas.ListEmpresasAsync(UserId(), token) });

    // GET /api/v1/empresas/{idEmpresa} não diferencia recurso inexistente de recurso fora do escopo.
    [HttpGet("{idEmpresa:guid}")]
    public async Task<IActionResult> Find(string idEmpresa, CancellationToken token) =>
        Ok(new { data = await empresas.FindEmpresaAsync(UserId(), idEmpresa, token) });

    // GET /api/v1/empresas/{idEmpresa}/lojas usa funcionario_loja para limitar a coleção retornada.
    [HttpGet("{idEmpresa:guid}/lojas")]
    public async Task<IActionResult> ListLojas(string idEmpresa, CancellationToken token) =>
        Ok(new { data = await empresas.ListLojasAsync(UserId(), idEmpresa, token) });

    // O claim sub é a identidade global já validada pelo middleware de autenticação.
    private string UserId() => User.FindFirstValue("sub")!;
}
