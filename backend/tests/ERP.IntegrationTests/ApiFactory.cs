using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ERP.IntegrationTests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Error);
        });
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MariaDb")
                ?? "Server=127.0.0.1;Port=3306;Database=tomazelli_erp_test;User ID=test;Password=test";
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:MariaDb"] = connectionString,
                ["Authentication:Issuer"] = "tomazelli-erp-tests",
                ["Authentication:Audience"] = "tomazelli-erp-test-client",
                ["Authentication:SigningKey"] = "test-only-signing-key-with-at-least-32-bytes",
                ["Web:Origins:0"] = "http://localhost:5173"
            });
        });
    }
}
