using System.Security.Claims;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ERP.Api.Authorization;
using ERP.Application.Authorization;

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

    // Leitura exige permissão empresarial e ainda limita a coleção à empresa do funcionário autenticado.
    [HttpGet]
    [RequirePermission(Permissions.AdministracaoEmpresaVisualizar)]
    public async Task<IActionResult> List(CancellationToken token) =>
        Ok(new { data = await empresas.ListEmpresasAsync(UserId(), token) });

    // Permissão de leitura não revela recurso fora do escopo, que continua indistinguível de um ID inexistente.
    [HttpGet("{idEmpresa:guid}")]
    [RequirePermission(Permissions.AdministracaoEmpresaVisualizar)]
    public async Task<IActionResult> Find(string idEmpresa, CancellationToken token) =>
        Ok(new { data = await empresas.FindEmpresaAsync(UserId(), idEmpresa, token) });

    // Edição exige concessão própria e altera somente nome/ativo, mantendo IDs fora do contrato de entrada.
    [HttpPut("{idEmpresa:guid}")]
    [RequirePermission(Permissions.AdministracaoEmpresaEditar)]
    public async Task<IActionResult> Update(string idEmpresa, [FromBody] UpdateEmpresaRequest request, CancellationToken token) =>
        Ok(new { data = await empresas.UpdateEmpresaAsync(UserId(), idEmpresa, request, token) });

    // A permissão de visualizar lojas não substitui funcionario_loja, usado para limitar a coleção retornada.
    [HttpGet("{idEmpresa:guid}/lojas")]
    [RequirePermission(Permissions.AdministracaoLojasVisualizar)]
    public async Task<IActionResult> ListLojas(string idEmpresa, CancellationToken token) =>
        Ok(new { data = await empresas.ListLojasAsync(UserId(), idEmpresa, token) });

    // Gerenciamento autoriza criar, enquanto service e SQL preservam empresa e vínculo do funcionário atomicamente.
    [HttpPost("{idEmpresa:guid}/lojas")]
    [RequirePermission(Permissions.AdministracaoLojasGerenciar)]
    public async Task<IActionResult> CreateLoja(string idEmpresa, [FromBody] CreateLojaRequest request, CancellationToken token)
    {
        var loja = await empresas.CreateLojaAsync(UserId(), idEmpresa, request, token);
        return CreatedAtAction(nameof(LojasController.Find), "Lojas", new { idLoja = loja.Id }, new { data = loja });
    }

    // O claim sub é a identidade global já validada pelo middleware de autenticação.
    private string UserId() => User.FindFirstValue("sub")!;
}
