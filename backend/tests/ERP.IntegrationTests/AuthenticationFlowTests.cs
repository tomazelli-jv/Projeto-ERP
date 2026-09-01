using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Dapper;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

[Collection(DatabaseCollection.Name)]
public sealed class AuthenticationFlowTests(DatabaseFixture database)
{
    [Fact]
    public async Task AuthenticationRecords_MaterializeChar36IdentifiersAsStrings()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var repository = new AuthenticationRepository();
        var userId = Guid.NewGuid().ToString();
        var sessionId = Guid.NewGuid().ToString();
        var tokenId = Guid.NewGuid().ToString();
        var familyId = Guid.NewGuid().ToString();
        var email = $"materialization-{Guid.NewGuid():N}@example.test";
        var now = DateTime.UtcNow;
        var expires = now.AddDays(1);
        var tokenHash = Convert.ToHexStringLower(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

        await using var connection = await source.OpenConnectionAsync();
        await connection.ExecuteAsync(
            "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,data_cadastro,ativo) VALUES (@Id,@UserName,@PasswordHash,@Email,@Now,1)",
            new { Id = userId, UserName = $"materialization.{Guid.NewGuid():N}", PasswordHash = "$argon2id$test", Email = email, Now = now });
        await using (var transaction = await connection.BeginTransactionAsync())
        {
            var user = await repository.FindUserByEmailAsync(connection, transaction, email, CancellationToken.None);
            Assert.NotNull(user);
            Assert.IsType<string>(user.Id);
            Assert.Equal(userId, user.Id);

            await repository.CreateSessionAsync(connection, transaction, sessionId, userId, now, expires, null, "materialization-test", CancellationToken.None);
            await repository.CreateRefreshTokenAsync(connection, transaction, tokenId, sessionId, tokenHash, familyId, null, now, expires, CancellationToken.None);

            var session = await repository.FindSessionForUpdateAsync(connection, transaction, sessionId, CancellationToken.None);
            Assert.NotNull(session);
            Assert.IsType<string>(session.Id);
            Assert.IsType<string>(session.UserId);
            Assert.Equal(sessionId, session.Id);
            Assert.Equal(userId, session.UserId);

            var refresh = await repository.FindRefreshForUpdateAsync(connection, transaction, tokenHash, CancellationToken.None);
            Assert.NotNull(refresh);
            Assert.IsType<string>(refresh.Id);
            Assert.IsType<string>(refresh.SessionId);
            Assert.IsType<string>(refresh.FamilyId);
            Assert.Equal(tokenId, refresh.Id);
            Assert.Equal(sessionId, refresh.SessionId);
            Assert.Equal(familyId, refresh.FamilyId);
            await transaction.CommitAsync();
        }

        var sessions = await repository.ListSessionsAsync(connection, userId, CancellationToken.None);
        var listed = Assert.Single(sessions, item => item.Id == sessionId);
        Assert.IsType<string>(listed.Id);
        Assert.IsType<string>(listed.UserId);
        Assert.Equal(userId, listed.UserId);
    }

    [Fact]
    public async Task LoginRefreshMeSessionsLogoutAndReuse_AreSafeAndTransactional()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory();
        var userId = Guid.NewGuid().ToString(); var companyId = Guid.NewGuid().ToString(); var email = $"auth-{Guid.NewGuid():N}@example.test"; const string password = "  uma senha exata e segura  ";
        var hasher = factory.Services.GetRequiredService<IPasswordHasher>(); var passwordHash = await hasher.HashAsync(password);
        await using (var setup = await source.OpenConnectionAsync())
        {
            await setup.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Id,'Empresa Auth')", new { Id = companyId });
            await setup.ExecuteAsync("INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,1)", new { Id = userId, UserName = $"auth.{Guid.NewGuid():N}", Hash = passwordHash, Email = email });
            await setup.ExecuteAsync("INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@CompanyId,'Usuário Autenticado')", new { Id = Guid.NewGuid().ToString(), UserId = userId, CompanyId = companyId });
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login") { Content = JsonContent.Create(new { email = email.ToUpperInvariant(), password }) };
        var loginResponse = await client.SendAsync(login); Stage(loginResponse.StatusCode == HttpStatusCode.OK, "AUTH_STAGE_LOGIN");
        var loginBody = await loginResponse.Content.ReadAsStringAsync(); Stage(!loginBody.Contains("refresh", StringComparison.OrdinalIgnoreCase) && !loginBody.Contains(passwordHash, StringComparison.Ordinal), "AUTH_STAGE_LOGIN_RESPONSE");
        using var loginJson = JsonDocument.Parse(loginBody); var access = loginJson.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!;
        var cookie = CookieValue(loginResponse);

        var validSessionId = factory.Services.GetRequiredService<IAccessTokenService>().Validate(access, DateTime.UtcNow).SessionId;
        var directSessions = await factory.Services.GetRequiredService<AuthenticationService>().SessionsAsync(userId, validSessionId, CancellationToken.None);
        Stage(directSessions.Count == 1 && directSessions[0].Current, "AUTH_STAGE_DIRECT_RESULT");

        var me = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me"); me.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        var meResponse = await client.SendAsync(me);
        Stage(meResponse.StatusCode == HttpStatusCode.OK, "AUTH_STAGE_ME");
        using var meJson = JsonDocument.Parse(await meResponse.Content.ReadAsStringAsync());
        var identity = meJson.RootElement.GetProperty("data");
        Stage(identity.GetProperty("name").GetString() == "Usuário Autenticado", "AUTH_STAGE_DISPLAY_NAME");
        Stage(identity.GetProperty("status").GetString() == "active", "AUTH_STAGE_ACTIVE_STATUS");
        Stage(!identity.TryGetProperty("memberships", out _), "AUTH_STAGE_NO_MEMBERSHIPS");
        var sessions = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/sessions"); sessions.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        var sessionsResponse = await client.SendAsync(sessions);
        Stage(sessionsResponse.StatusCode != HttpStatusCode.Unauthorized, "AUTH_STAGE_SESSIONS_UNAUTHORIZED");
        Stage(sessionsResponse.StatusCode != HttpStatusCode.InternalServerError, "AUTH_STAGE_SESSIONS_SERVER_ERROR");
        Stage(sessionsResponse.StatusCode == HttpStatusCode.OK, "AUTH_STAGE_SESSIONS_OTHER_STATUS");
        using var sessionsJson = JsonDocument.Parse(await sessionsResponse.Content.ReadAsStringAsync());
        Stage(sessionsJson.RootElement.GetProperty("data").EnumerateArray().Any(item => item.GetProperty("current").GetBoolean()), "AUTH_STAGE_SESSIONS");

        var concurrent = await Task.WhenAll(
            client.SendAsync(CookieRequest(HttpMethod.Post, "/api/v1/auth/refresh", cookie)),
            client.SendAsync(CookieRequest(HttpMethod.Post, "/api/v1/auth/refresh", cookie)));
        var concurrencyStatus = string.Join('_', concurrent.Select(response => (int)response.StatusCode).Order());
        var concurrencyIsValid = concurrent.Count(response => response.StatusCode == HttpStatusCode.OK) == 1 && concurrent.Count(response => response.StatusCode == HttpStatusCode.Unauthorized) == 1;
        if (!concurrencyIsValid)
        {
            var diagnostics = await Task.WhenAll(concurrent.Select(SanitizedResponseAsync));
            Stage(false, $"AUTH_STAGE_CONCURRENCY_{concurrencyStatus}: {string.Join(" | ", diagnostics)}");
        }
        var refreshResponse = concurrent.Single(response => response.StatusCode == HttpStatusCode.OK);
        var reuseResponse = concurrent.Single(response => response.StatusCode == HttpStatusCode.Unauthorized);
        var rotatedCookie = CookieValue(refreshResponse); Stage(cookie != rotatedCookie, "AUTH_STAGE_ROTATION_COOKIE");
        Stage((await reuseResponse.Content.ReadAsStringAsync()).Contains("REFRESH_TOKEN_REUSED", StringComparison.Ordinal), "AUTH_STAGE_REUSE_RESPONSE");
        var revokedMe = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me"); revokedMe.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        Stage((await client.SendAsync(revokedMe)).StatusCode == HttpStatusCode.Unauthorized, "AUTH_STAGE_REVOKED_ACCESS");

        await using var verify = await source.OpenConnectionAsync();
        Stage(await verify.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sessao_usuario WHERE id_usuario=@UserId AND revogada_em IS NOT NULL", new { UserId = userId }) == 1, "AUTH_STAGE_SESSION_REVOKED");
        Stage(await verify.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM token_refresh WHERE token_hash=@Raw", new { Raw = cookie }) == 0, "AUTH_STAGE_RAW_TOKEN_ABSENT");
        Stage(await verify.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM evento_seguranca WHERE id_usuario=@UserId", new { UserId = userId }) >= 4, "AUTH_STAGE_EVENTS");
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
    public async Task InactiveUser_IsRejected_AndUserNameIsTheDisplayNameFallback()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory();
        var hasher = factory.Services.GetRequiredService<IPasswordHasher>();
        const string password = "uma frase senha segura";
        var passwordHash = await hasher.HashAsync(password);
        var inactiveEmail = $"inactive-{Guid.NewGuid():N}@example.test";
        var activeEmail = $"fallback-{Guid.NewGuid():N}@example.test";
        var activeId = Guid.NewGuid().ToString();
        await using (var setup = await source.OpenConnectionAsync())
        {
            await setup.ExecuteAsync(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,0)",
                new { Id = Guid.NewGuid().ToString(), UserName = $"inactive.{Guid.NewGuid():N}", Hash = passwordHash, Email = inactiveEmail });
            await setup.ExecuteAsync(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,1)",
                new { Id = activeId, UserName = "nome.de.usuario", Hash = passwordHash, Email = activeEmail });
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var inactive = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = inactiveEmail, password });
        Assert.Equal(HttpStatusCode.Unauthorized, inactive.StatusCode);
        Assert.Contains("INVALID_CREDENTIALS", await inactive.Content.ReadAsStringAsync());

        var active = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = activeEmail, password });
        Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        using var json = JsonDocument.Parse(await active.Content.ReadAsStringAsync());
        var data = json.RootElement.GetProperty("data");
        var returnedUser = data.GetProperty("user");
        Assert.Equal(activeId, returnedUser.GetProperty("id").GetString());
        Assert.Equal("nome.de.usuario", returnedUser.GetProperty("name").GetString());
        await using (var setup = await source.OpenConnectionAsync())
            await setup.ExecuteAsync("UPDATE usuarios SET ativo=0 WHERE id_usuario=@Id", new { Id = activeId });
        var me = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        me.Headers.Authorization = new AuthenticationHeaderValue("Bearer", data.GetProperty("accessToken").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(me)).StatusCode);
    }

    [Fact]
    public async Task LogoutLogoutAllAndSessionRevocation_RespectSessionOwnership()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        await using var factory = new ApiFactory();
        var hasher = factory.Services.GetRequiredService<IPasswordHasher>();
        var service = factory.Services.GetRequiredService<AuthenticationService>();
        var tokens = factory.Services.GetRequiredService<IAccessTokenService>();
        const string password = "outra frase senha segura";
        var passwordHash = await hasher.HashAsync(password);
        var firstId = Guid.NewGuid().ToString();
        var secondId = Guid.NewGuid().ToString();
        var firstEmail = $"sessions-{Guid.NewGuid():N}@example.test";
        var secondEmail = $"other-{Guid.NewGuid():N}@example.test";
        await using (var setup = await source.OpenConnectionAsync())
        {
            await setup.ExecuteAsync(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,1)",
                new { Id = firstId, UserName = $"sessions.{Guid.NewGuid():N}", Hash = passwordHash, Email = firstEmail });
            await setup.ExecuteAsync(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,1)",
                new { Id = secondId, UserName = $"other.{Guid.NewGuid():N}", Hash = passwordHash, Email = secondEmail });
        }

        var firstLogin = await service.LoginAsync(new LoginRequest { Email = firstEmail, Password = password }, null, "first", CancellationToken.None);
        var secondFirstLogin = await service.LoginAsync(new LoginRequest { Email = firstEmail, Password = password }, null, "second", CancellationToken.None);
        var otherLogin = await service.LoginAsync(new LoginRequest { Email = secondEmail, Password = password }, null, "other", CancellationToken.None);
        var firstSession = tokens.Validate(firstLogin.AccessToken, DateTime.UtcNow).SessionId;
        var secondFirstSession = tokens.Validate(secondFirstLogin.AccessToken, DateTime.UtcNow).SessionId;
        var otherSession = tokens.Validate(otherLogin.AccessToken, DateTime.UtcNow).SessionId;

        Assert.Equal(2, (await service.SessionsAsync(firstId, firstSession, CancellationToken.None)).Count);
        await service.RevokeSessionAsync(firstId, firstSession, otherSession, null, CancellationToken.None);
        Assert.True(await service.ValidateSessionAsync(secondId, otherSession, CancellationToken.None));
        await service.RevokeSessionAsync(firstId, firstSession, secondFirstSession, null, CancellationToken.None);
        Assert.False(await service.ValidateSessionAsync(firstId, secondFirstSession, CancellationToken.None));
        await service.LogoutAsync(firstLogin.RefreshToken, null, CancellationToken.None);
        Assert.False(await service.ValidateSessionAsync(firstId, firstSession, CancellationToken.None));

        var thirdLogin = await service.LoginAsync(new LoginRequest { Email = firstEmail, Password = password }, null, "third", CancellationToken.None);
        var fourthLogin = await service.LoginAsync(new LoginRequest { Email = firstEmail, Password = password }, null, "fourth", CancellationToken.None);
        var thirdSession = tokens.Validate(thirdLogin.AccessToken, DateTime.UtcNow).SessionId;
        var fourthSession = tokens.Validate(fourthLogin.AccessToken, DateTime.UtcNow).SessionId;
        await service.LogoutAllAsync(firstId, thirdSession, null, CancellationToken.None);
        Assert.False(await service.ValidateSessionAsync(firstId, thirdSession, CancellationToken.None));
        Assert.False(await service.ValidateSessionAsync(firstId, fourthSession, CancellationToken.None));
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
    private static void Stage(bool condition, string code) => Assert.True(condition, code);

    private static async Task<string> SanitizedResponseAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        try
        {
            var json = JsonNode.Parse(body);
            RedactSecrets(json);
            return $"HTTP {(int)response.StatusCode} {json?.ToJsonString() ?? "null"}";
        }
        catch (JsonException)
        {
            return $"HTTP {(int)response.StatusCode} <corpo não JSON omitido>";
        }
    }

    private static void RedactSecrets(JsonNode? node)
    {
        if (node is JsonObject jsonObject)
        {
            foreach (var property in jsonObject.ToArray())
            {
                if (IsSensitiveName(property.Key))
                    jsonObject[property.Key] = "[REDACTED]";
                else
                    RedactSecrets(property.Value);
            }
        }
        else if (node is JsonArray jsonArray)
        {
            foreach (var item in jsonArray) RedactSecrets(item);
        }
    }

    private static bool IsSensitiveName(string name) =>
        name.Contains("token", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("password", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("secret", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("cookie", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("authorization", StringComparison.OrdinalIgnoreCase);
}
