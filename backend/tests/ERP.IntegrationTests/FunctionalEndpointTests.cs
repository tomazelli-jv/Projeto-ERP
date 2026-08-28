using System.Net;
using System.Net.Http.Json;
using Dapper;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using MySqlConnector;

namespace ERP.IntegrationTests;

[Collection(DatabaseCollection.Name)]
public sealed class FunctionalEndpointTests(DatabaseFixture database)
{
    [Fact]
    public async Task StrictContracts_ReturnSafeValidationErrorsWithoutDatabaseAccess()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var onboarding = await client.PostAsJsonAsync("/api/v1/onboarding", new { tenantId = "forbidden" });
        var password = await client.PostAsJsonAsync("/api/v1/auth/password/setup/confirm", new { token = "secret", password = "uma frase senha segura", userId = "forbidden" });
        Assert.Equal(HttpStatusCode.BadRequest, onboarding.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, password.StatusCode);
        Assert.Contains("VALIDATION_ERROR", await onboarding.Content.ReadAsStringAsync());
        Assert.DoesNotContain("secret", await password.Content.ReadAsStringAsync());
        for (var attempt = 0; attempt < 4; attempt++)
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/password/setup/confirm", new { token = "secret", password = "uma frase senha segura", userId = "forbidden" })).StatusCode);
        var limited = await client.PostAsJsonAsync("/api/v1/auth/password/setup/confirm", new { token = "secret", password = "uma frase senha segura" });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Contains("RATE_LIMIT_EXCEEDED", await limited.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Onboarding_AndPasswordSetup_CommitCompleteSafeFlow()
    {
        if (!database.Enabled) return;
        await using var source = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(source)).UpAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var planId = Guid.NewGuid().ToString();
        await using (var setup = await source.OpenConnectionAsync())
        {
            await setup.ExecuteAsync("INSERT INTO plans (id,code,name,is_active,is_public) VALUES (@Id,@Code,'Functional',1,1)", new { Id = planId, Code = $"P-{suffix}" });
            foreach (var key in new[] { "max_companies", "max_branches", "max_users" })
                await setup.ExecuteAsync("INSERT INTO plan_limits (id,plan_id,`key`,`value`) VALUES (@Id,@PlanId,@Key,1)", new { Id = Guid.NewGuid().ToString(), PlanId = planId, Key = key });
        }

        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var payload = new
        {
            tenant = new { name = "  Empresa Ágil  ", slug = $"Empresa Ágil {suffix}" },
            company = new { legalName = "  Empresa Ágil Ltda  ", tradeName = "Ágil", taxId = "11.222.333/0001-81" },
            branch = new { legalName = "Matriz", phone = "(11) 99999-9999", address = new { postalCode = "01310-100", street = "Paulista", number = "1", district = "Bela Vista", city = "São Paulo", state = "sp", countryCode = "br" } },
            owner = new { name = "  Proprietário  ", email = $" OWNER-{suffix}@EXAMPLE.COM ", phone = "(11) 98888-7777" },
            planCode = $"p-{suffix}"
        };
        var response = await client.PostAsJsonAsync("/api/v1/onboarding", payload);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.DoesNotContain("token", body, StringComparison.OrdinalIgnoreCase);
        var notification = Assert.Single(factory.Notifier.Notifications);

        await using (var verification = await source.OpenConnectionAsync())
        {
            Assert.Equal(1, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM tenants WHERE slug=@Slug", new { Slug = $"empresa-agil-{suffix}" }));
            Assert.Equal(1, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM branches WHERE tax_id='11222333000181'"));
            Assert.Equal(0, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM password_setup_tokens WHERE token_hash=@Raw", new { Raw = notification.Token }));
        }

        var confirm = await client.PostAsJsonAsync("/api/v1/auth/password/setup/confirm", new { token = notification.Token, password = "uma frase senha segura" });
        Assert.Equal(HttpStatusCode.OK, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await client.PostAsJsonAsync("/api/v1/auth/password/setup/confirm", new { token = notification.Token, password = "uma frase senha segura" })).StatusCode);
        await using var final = await source.OpenConnectionAsync();
        var hash = await final.ExecuteScalarAsync<string>("SELECT password_hash FROM user_credentials LIMIT 1");
        Assert.StartsWith("$argon2id$v=19$m=19456,t=2,p=1$", hash);
    }
}
