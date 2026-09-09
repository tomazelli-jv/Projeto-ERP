using System.Security.Claims;
using ERP.Api.Authorization;
using ERP.Application.Authorization;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// Catálogo retorna somente perfis oficiais atribuíveis, sem expor a matriz completa de permissões.
[ApiController, Authorize, Route("api/v1/perfis")]
public sealed class PerfisController(UserManagementService users) : ControllerBase
{
    [HttpGet, RequirePermission(Permissions.AdministracaoUsuariosVisualizar)]
    public async Task<IActionResult> List(CancellationToken token) =>
        Ok(new { data = await users.ListProfilesAsync(User.FindFirstValue("sub")!, token) });
}
