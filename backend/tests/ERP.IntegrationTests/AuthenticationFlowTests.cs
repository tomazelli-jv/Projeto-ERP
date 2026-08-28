using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using ERP.Application.Abstractions;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

[Collection(DatabaseCollection.Name)]
public sealed class AuthenticationFlowTests(DatabaseFixture database)
{
    [Fact]
    public async Task LoginRefreshMeSessionsLogoutAndReuse_AreSafeAndTransactional()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory();
        var userId = Guid.NewGuid().ToString(); var tenantId = Guid.NewGuid().ToString(); var email = $"auth-{Guid.NewGuid():N}@example.test"; const string password = "  uma senha exata e segura  ";
        var hasher = factory.Services.GetRequiredService<IPasswordHasher>(); var passwordHash = await hasher.HashAsync(password);
        await using (var setup = await source.OpenConnectionAsync())
        {
            await setup.ExecuteAsync("INSERT INTO users (id,name,email,status) VALUES (@Id,'Auth User',@Email,'active')", new { Id = userId, Email = email });
            await setup.ExecuteAsync("INSERT INTO user_credentials (id,user_id,password_hash) VALUES (@Id,@UserId,@Hash)", new { Id = Guid.NewGuid().ToString(), UserId = userId, Hash = passwordHash });
            await setup.ExecuteAsync("INSERT INTO tenants (id,name,slug,status) VALUES (@Id,'Auth Tenant',@Slug,'active')", new { Id = tenantId, Slug = $"auth-{Guid.NewGuid():N}" });
            await setup.ExecuteAsync("INSERT INTO tenant_memberships (id,tenant_id,user_id,status,is_owner) VALUES (@Id,@TenantId,@UserId,'active',1)", new { Id = Guid.NewGuid().ToString(), TenantId = tenantId, UserId = userId });
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login") { Content = JsonContent.Create(new { email = email.ToUpperInvariant(), password }) };
        var loginResponse = await client.SendAsync(login); Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginBody = await loginResponse.Content.ReadAsStringAsync(); Assert.DoesNotContain("refresh", loginBody, StringComparison.OrdinalIgnoreCase); Assert.DoesNotContain(passwordHash, loginBody);
        using var loginJson = JsonDocument.Parse(loginBody); var access = loginJson.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!;
        var cookie = CookieValue(loginResponse);

        var me = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me"); me.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(me)).StatusCode);
        var sessions = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/sessions"); sessions.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        var sessionsBody = await (await client.SendAsync(sessions)).Content.ReadAsStringAsync(); Assert.Contains("\"current\":true", sessionsBody);

        var concurrent = await Task.WhenAll(
            client.SendAsync(CookieRequest(HttpMethod.Post, "/api/v1/auth/refresh", cookie)),
            client.SendAsync(CookieRequest(HttpMethod.Post, "/api/v1/auth/refresh", cookie)));
        var refreshResponse = Assert.Single(concurrent, response => response.StatusCode == HttpStatusCode.OK);
        var reuseResponse = Assert.Single(concurrent, response => response.StatusCode == HttpStatusCode.Unauthorized);
        var rotatedCookie = CookieValue(refreshResponse); Assert.NotEqual(cookie, rotatedCookie);
        Assert.Contains("REFRESH_TOKEN_REUSED", await reuseResponse.Content.ReadAsStringAsync());
        var revokedMe = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me"); revokedMe.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(revokedMe)).StatusCode);

        await using var verify = await source.OpenConnectionAsync();
        Assert.Equal(1, await verify.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM auth_sessions WHERE user_id=@UserId AND revoked_at IS NOT NULL", new { UserId = userId }));
        Assert.Equal(0, await verify.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM refresh_tokens WHERE token_hash=@Raw", new { Raw = cookie }));
        Assert.True(await verify.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM security_events WHERE user_id=@UserId", new { UserId = userId }) >= 4);
    }

    [Fact]
    public async Task InvalidLogin_IsGeneric_Strict_AndDoesNotCreateSession()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory(); using var client = factory.CreateClient();
        var missing = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = $"missing-{Guid.NewGuid():N}@example.test", password = "wrong password" });
        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode); Assert.Contains("INVALID_CREDENTIALS", await missing.Content.ReadAsStringAsync());
        var strict = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "user@example.test", password = "wrong password", role = "admin" });
        Assert.Equal(HttpStatusCode.BadRequest, strict.StatusCode);
    }

    [Fact]
    public async Task CookieEndpoints_RejectMissingOrForeignOrigin()
    {
        await using var factory = new ApiFactory(); using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/api/v1/auth/refresh", null)).StatusCode);
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh"); request.Headers.Add("Origin", "https://evil.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }

    private static HttpRequestMessage CookieRequest(HttpMethod method, string path, string cookie)
    { var request = new HttpRequestMessage(method, path); request.Headers.Add("Origin", "http://localhost:5173"); request.Headers.Add("Cookie", $"erp_refresh={cookie}"); return request; }
    private static string CookieValue(HttpResponseMessage response) => response.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith("erp_refresh=", StringComparison.Ordinal)).Split(';')[0].Split('=', 2)[1];
}
