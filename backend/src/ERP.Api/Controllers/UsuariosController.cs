using System.Security.Claims;
using ERP.Api.Authorization;
using ERP.Application.Authorization;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Controller expõe identidade e acesso sem incorporar SQL ou aceitar contexto empresarial do cliente.
[ApiController, Authorize, Route("api/v1/usuarios")]
public sealed class UsuariosController(UserManagementService users) : ControllerBase
{
    [HttpGet, RequirePermission(Permissions.AdministracaoUsuariosVisualizar)]
    public async Task<IActionResult> List(CancellationToken token) => Ok(new { data = await users.ListUsersAsync(UserId(), token) });

    [HttpGet("{idUsuario:guid}"), RequirePermission(Permissions.AdministracaoUsuariosVisualizar)]
    public async Task<IActionResult> Find(string idUsuario, CancellationToken token) => Ok(new { data = await users.FindUserAsync(UserId(), idUsuario, token) });

    // Alteração de ativo passa pelo service para aplicar auto-proteção, último administrador e revogação de sessões.
    [HttpPut("{idUsuario:guid}"), RequirePermission(Permissions.AdministracaoUsuariosGerenciar)]
    public async Task<IActionResult> Update(string idUsuario, [FromBody] UpdateManagedUserRequest request, CancellationToken token) =>
        Ok(new { data = await users.UpdateUserAsync(UserId(), idUsuario, request, token) });

    // Perfil é uma operação própria para não misturar dados cadastrais com concessões de segurança.
    [HttpPut("{idUsuario:guid}/perfil"), RequirePermission(Permissions.AdministracaoUsuariosGerenciar)]
    public async Task<IActionResult> UpdateProfile(string idUsuario, [FromBody] UpdateManagedProfileRequest request, CancellationToken token) =>
        Ok(new { data = await users.UpdateProfileAsync(UserId(), idUsuario, request, token) });

    private string UserId() => User.FindFirstValue("sub")!;
}
