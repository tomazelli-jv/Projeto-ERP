using ERP.Infrastructure.Database;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("MariaDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:MariaDb is required. Configure it through environment variables outside Development/Test.");
        }

        services.AddSingleton(new MySqlDataSourceBuilder(connectionString).Build());
        services.AddSingleton<IMariaDbConnectionFactory, MariaDbConnectionFactory>();
        services.AddSingleton<MariaDbHealthCheck>();
        return services;
    }
}
