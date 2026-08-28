using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using ERP.Application.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ERP.IntegrationTests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public CapturingNotifier Notifier { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MariaDb")
                ?? "Server=127.0.0.1;Port=3306;Database=tomazelli_erp_test;User ID=test;Password=test";
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:MariaDb"] = connectionString
            });
        });
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IPasswordSetupNotifier>();
            services.AddSingleton<IPasswordSetupNotifier>(Notifier);
        });
    }
}

public sealed class CapturingNotifier : IPasswordSetupNotifier
{
    private readonly System.Collections.Concurrent.ConcurrentQueue<PasswordSetupNotification> _notifications = new();
    public IReadOnlyCollection<PasswordSetupNotification> Notifications => _notifications.ToArray();
    public Task DeliverAsync(PasswordSetupNotification notification, CancellationToken cancellationToken = default)
    {
        _notifications.Enqueue(notification);
        return Task.CompletedTask;
    }
}
