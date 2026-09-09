using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace ERP.IntegrationTests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly TestErrorLogProvider _errorLogs = new();

    public IReadOnlyCollection<string> ErrorLogs => _errorLogs.Messages;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
            logging.AddProvider(_errorLogs);
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

// Keeps only error-level diagnostics so failed HTTP assertions can expose the server exception in CI without logging request secrets.
internal sealed class TestErrorLogProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<string> _messages = new();

    public IReadOnlyCollection<string> Messages => _messages.ToArray();

    public ILogger CreateLogger(string categoryName) => new TestErrorLogger(categoryName, _messages);

    public void Dispose()
    {
    }

    private sealed class TestErrorLogger(string categoryName, ConcurrentQueue<string> messages) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Error;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;
            messages.Enqueue($"{categoryName}: {formatter(state, exception)}{Environment.NewLine}{exception}");
        }
    }
}
