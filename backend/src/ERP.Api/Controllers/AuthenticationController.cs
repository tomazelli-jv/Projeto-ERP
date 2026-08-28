using System.Security.Claims;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.RateLimiting;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthenticationController(AuthenticationService authentication, IOptions<AuthenticationOptions> options, IWebHostEnvironment environment) : ControllerBase
{
    private readonly AuthenticationOptions _options = options.Value;

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [Consumes("application/json")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken token)
    {
        var result = await authentication.LoginAsync(request, Ip(), Agent(), token);
        SetCookie(result.RefreshToken, result.SessionExpiresAtUtc);
        return Ok(new { data = new { result.AccessToken, result.TokenType, result.ExpiresIn, result.User } });
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("refresh")]
    [Consumes("application/json")]
    public async Task<IActionResult> Refresh(CancellationToken token)
    {
        try
        {
            var result = await authentication.RefreshAsync(Request.Cookies[_options.RefreshCookieName] ?? "", Ip(), token);
            SetCookie(result.RefreshToken, result.SessionExpiresAtUtc);
            return Ok(new { data = new { result.AccessToken, result.TokenType, result.ExpiresIn } });
        }
        catch { DeleteCookie(); throw; }
    }

    [HttpPost("logout")]
    [Consumes("application/json")]
    public async Task<IActionResult> Logout(CancellationToken token)
    { await authentication.LogoutAsync(Request.Cookies[_options.RefreshCookieName], Ip(), token); DeleteCookie(); return NoContent(); }

    [Authorize]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll(CancellationToken token)
    { await authentication.LogoutAllAsync(UserId(), SessionId(), Ip(), token); DeleteCookie(); return NoContent(); }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken token) => Ok(new { data = await authentication.MeAsync(UserId(), token) });

    [Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> Sessions(CancellationToken token) => Ok(new { data = await authentication.SessionsAsync(UserId(), SessionId(), token) });

    [Authorize]
    [HttpDelete("sessions/{sessionId:guid}")]
    public async Task<IActionResult> RevokeSession(string sessionId, CancellationToken token)
    { await authentication.RevokeSessionAsync(UserId(), SessionId(), sessionId, Ip(), token); if (sessionId == SessionId()) DeleteCookie(); return NoContent(); }

    private string UserId() => User.FindFirstValue("sub")!;
    private string SessionId() => User.FindFirstValue("sid")!;
    private string? Ip() => HttpContext.Connection.RemoteIpAddress?.ToString();
    private string? Agent() => Request.Headers.UserAgent.ToString();
    private CookieOptions CookieOptions(DateTime? expires = null) => new() { HttpOnly = true, Secure = !environment.IsDevelopment() && !environment.IsEnvironment("Test"), SameSite = SameSiteMode.Lax, Path = "/api/v1/auth", Expires = expires };
    private void SetCookie(string token, DateTime expires) => Response.Cookies.Append(_options.RefreshCookieName, token, CookieOptions(expires));
    private void DeleteCookie() => Response.Cookies.Delete(_options.RefreshCookieName, CookieOptions(DateTime.UnixEpoch));
}
