using System.Net;
using System.Net.Http.Json;

namespace ERP.IntegrationTests;

public sealed class HealthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Live_ReturnsOkWithoutDatabase()
    {
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/health/live");
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body?.Status);
        Assert.True(response.Headers.Contains("X-Request-Id"));
    }

    [Fact]
    public async Task Ready_UsesRealMariaDb_WhenExplicitlyEnabled()
    {
        if (!string.Equals(Environment.GetEnvironmentVariable("DB_INTEGRATION_TESTS"), "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        using var client = factory.CreateClient();
        var response = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private sealed record HealthResponse(string Status);
}
