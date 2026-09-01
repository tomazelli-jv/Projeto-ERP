using System.Security.Claims;
using ERP.Application.Contracts;
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
    // POST permanece protegido por uma negação explícita até o modelo possuir autoridade global para criar empresas.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmpresaRequest request, CancellationToken token) =>
        Ok(new { data = await empresas.CreateEmpresaAsync(UserId(), request, token) });

    // GET /api/v1/empresas retorna uma coleção limitada à empresa do funcionário autenticado.
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken token) =>
        Ok(new { data = await empresas.ListEmpresasAsync(UserId(), token) });

    // GET /api/v1/empresas/{idEmpresa} não diferencia recurso inexistente de recurso fora do escopo.
    [HttpGet("{idEmpresa:guid}")]
    public async Task<IActionResult> Find(string idEmpresa, CancellationToken token) =>
        Ok(new { data = await empresas.FindEmpresaAsync(UserId(), idEmpresa, token) });

    // PUT altera somente nome e ativo, mantendo id e data de cadastro fora do contrato de entrada.
    [HttpPut("{idEmpresa:guid}")]
    public async Task<IActionResult> Update(string idEmpresa, [FromBody] UpdateEmpresaRequest request, CancellationToken token) =>
        Ok(new { data = await empresas.UpdateEmpresaAsync(UserId(), idEmpresa, request, token) });

    // GET /api/v1/empresas/{idEmpresa}/lojas usa funcionario_loja para limitar a coleção retornada.
    [HttpGet("{idEmpresa:guid}/lojas")]
    public async Task<IActionResult> ListLojas(string idEmpresa, CancellationToken token) =>
        Ok(new { data = await empresas.ListLojasAsync(UserId(), idEmpresa, token) });

    // POST cria loja e vínculo do funcionário atomicamente e aponta Location para a consulta individual existente.
    [HttpPost("{idEmpresa:guid}/lojas")]
    public async Task<IActionResult> CreateLoja(string idEmpresa, [FromBody] CreateLojaRequest request, CancellationToken token)
    {
        var loja = await empresas.CreateLojaAsync(UserId(), idEmpresa, request, token);
        return CreatedAtAction(nameof(LojasController.Find), "Lojas", new { idLoja = loja.Id }, new { data = loja });
    }

    // O claim sub é a identidade global já validada pelo middleware de autenticação.
    private string UserId() => User.FindFirstValue("sub")!;
}
