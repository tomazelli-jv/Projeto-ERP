using System.Security.Claims;
using ERP.Api.Authorization;
using ERP.Application.Authorization;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

// The controller accepts no company id; company scope comes exclusively from the validated X-Loja-Id context.
[ApiController, Authorize, Route("api/v1/clientes")]
[RequirePermission(Permissions.ClientesVisualizar)]
public sealed class CustomersController(CustomerService customers) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] CustomerListQuery query, CancellationToken token)
    {
        var result = await customers.ListAsync(User.FindFirstValue("sub")!, Request.Headers["X-Loja-Id"].FirstOrDefault(), query, token);
        return Ok(new { result.Data, result.Pagination });
    }

    [HttpGet("{idCliente:guid}")]
    public async Task<IActionResult> Find(string idCliente, CancellationToken token) => Ok(new
    {
        data = await customers.FindAsync(User.FindFirstValue("sub")!, Request.Headers["X-Loja-Id"].FirstOrDefault(), idCliente, token)
    });
}
