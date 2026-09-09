using System.Security.Claims;
using ERP.Api.Authorization;
using ERP.Application.Authorization;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Funcionários permanecem pessoas da empresa e podem existir sem credencial de usuário.
[ApiController, Authorize, Route("api/v1/funcionarios")]
public sealed class FuncionariosController(UserManagementService users) : ControllerBase
{
    [HttpGet, RequirePermission(Permissions.AdministracaoUsuariosVisualizar)]
    public async Task<IActionResult> List(CancellationToken token) => Ok(new { data = await users.ListEmployeesAsync(UserId(), token) });

    [HttpGet("{idFuncionario:guid}"), RequirePermission(Permissions.AdministracaoUsuariosVisualizar)]
    public async Task<IActionResult> Find(string idFuncionario, CancellationToken token) => Ok(new { data = await users.FindEmployeeAsync(UserId(), idFuncionario, token) });

    [HttpGet("{idFuncionario:guid}/lojas"), RequirePermission(Permissions.AdministracaoUsuariosVisualizar)]
    public async Task<IActionResult> Stores(string idFuncionario, CancellationToken token) =>
        Ok(new { data = (await users.FindEmployeeAsync(UserId(), idFuncionario, token)).Lojas });

    [HttpPut("{idFuncionario:guid}"), RequirePermission(Permissions.AdministracaoUsuariosGerenciar)]
    public async Task<IActionResult> Update(string idFuncionario, [FromBody] UpdateManagedEmployeeRequest request, CancellationToken token) =>
        Ok(new { data = await users.UpdateEmployeeAsync(UserId(), idFuncionario, request, token) });

    // PUT representa substituição completa do conjunto após validação de todas as lojas da empresa.
    [HttpPut("{idFuncionario:guid}/lojas"), RequirePermission(Permissions.AdministracaoUsuariosGerenciar)]
    public async Task<IActionResult> UpdateStores(string idFuncionario, [FromBody] UpdateManagedStoresRequest request, CancellationToken token) =>
        Ok(new { data = await users.UpdateStoresAsync(UserId(), idFuncionario, request, token) });

    private string UserId() => User.FindFirstValue("sub")!;
}
