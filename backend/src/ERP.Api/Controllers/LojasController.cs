using System.Security.Claims;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ERP.Api.Authorization;
using ERP.Application.Authorization;

namespace ERP.Api.Controllers;

// Expõe a consulta individual de loja sem incorporar SQL ou regras de vínculo na camada HTTP.
[ApiController]
[Authorize]
[Route("api/v1/lojas")]
public sealed class LojasController(EmpresaService empresas) : ControllerBase
{
    // Mesmo com permissão de leitura, a rota retorna 404 quando a loja não está vinculada ao funcionário.
    [HttpGet("{idLoja:guid}")]
    [RequirePermission(Permissions.AdministracaoLojasVisualizar)]
    public async Task<IActionResult> Find(string idLoja, CancellationToken token) =>
        Ok(new { data = await empresas.FindLojaAsync(User.FindFirstValue("sub")!, idLoja, token) });

    // Gerenciamento é obrigatório, mas não amplia o escopo; somente campos editáveis da loja vinculada são alterados.
    [HttpPut("{idLoja:guid}")]
    [RequirePermission(Permissions.AdministracaoLojasGerenciar)]
    public async Task<IActionResult> Update(string idLoja, [FromBody] UpdateLojaRequest request, CancellationToken token) =>
        Ok(new { data = await empresas.UpdateLojaAsync(User.FindFirstValue("sub")!, idLoja, request, token) });
}
