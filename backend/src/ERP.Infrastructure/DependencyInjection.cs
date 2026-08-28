using ERP.Infrastructure.Database;
using ERP.Application.Abstractions;
using ERP.Infrastructure.Security;
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
        services.AddOptions<PasswordSecurityOptions>()
            .Bind(configuration.GetSection(PasswordSecurityOptions.SectionName))
            .Validate(options => options.MemoryCostKiB >= 8192 && options.Iterations > 0 && options.Parallelism > 0 && options.HashLength >= 16 && options.SetupTokenTtlHours > 0,
                "PasswordSecurity configuration is invalid.")
            .ValidateOnStart();
        services.AddSingleton<IMariaDbConnectionFactory, MariaDbConnectionFactory>();
        services.AddSingleton<IDatabaseSessionFactory, MariaDbConnectionFactory>();
        services.AddSingleton<IPasswordHasher, Argon2idPasswordHasher>();
        services.AddSingleton<MariaDbHealthCheck>();
        return services;
    }
}
