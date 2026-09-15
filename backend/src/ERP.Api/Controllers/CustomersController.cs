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
public sealed class CustomersController(CustomerService customers) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permissions.ClientesVisualizar)]
    public async Task<IActionResult> List([FromQuery] CustomerListQuery query, CancellationToken token)
    {
        var result = await customers.ListAsync(User.FindFirstValue("sub")!, Request.Headers["X-Loja-Id"].FirstOrDefault(), query, token);
        return Ok(new { result.Data, result.Pagination });
    }

    [HttpGet("{idCliente:guid}")]
    [RequirePermission(Permissions.ClientesVisualizar)]
    public async Task<IActionResult> Find(string idCliente, CancellationToken token) => Ok(new
    {
        data = await customers.FindAsync(User.FindFirstValue("sub")!, Request.Headers["X-Loja-Id"].FirstOrDefault(), idCliente, token)
    });

    // Server-side permission and operational context protect all write fields controlled outside the payload.
    [HttpPost, RequirePermission(Permissions.ClientesGerenciar)]
    public async Task<IActionResult> Create([FromBody] CustomerWriteRequest request, CancellationToken token)
    {
        var result = await customers.CreateAsync(User.FindFirstValue("sub")!, Request.Headers["X-Loja-Id"].FirstOrDefault(), request, token);
        return CreatedAtAction(nameof(Find), new { idCliente = result.IdCliente }, new { data = result });
    }

    [HttpPut("{idCliente:guid}"), RequirePermission(Permissions.ClientesGerenciar)]
    public async Task<IActionResult> Update(string idCliente, [FromBody] CustomerWriteRequest request, CancellationToken token) => Ok(new
    {
        data = await customers.UpdateAsync(User.FindFirstValue("sub")!, Request.Headers["X-Loja-Id"].FirstOrDefault(), idCliente, request, token)
    });
}
