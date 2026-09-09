using System.Security.Claims;
using ERP.Api.Authorization;
using ERP.Application.Authorization;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Endpoint composto explicita que usuário e funcionário nascem atomicamente na mesma empresa do administrador.
[ApiController, Authorize, Route("api/v1/usuarios-funcionarios")]
public sealed class UsuariosFuncionariosController(UserManagementService users) : ControllerBase
{
    [HttpPost, RequirePermission(Permissions.AdministracaoUsuariosGerenciar)]
    public async Task<IActionResult> Create([FromBody] CreateUserEmployeeRequest request, CancellationToken token)
    {
        var created = await users.CreateAsync(User.FindFirstValue("sub")!, request, token);
        return CreatedAtAction(nameof(UsuariosController.Find), "Usuarios", new { idUsuario = created.IdUsuario }, new { data = created });
    }
}
