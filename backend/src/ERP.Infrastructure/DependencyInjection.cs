using ERP.Infrastructure.Database;
using ERP.Application.Abstractions;
using ERP.Infrastructure.Security;
using ERP.Infrastructure.Migrations;
using ERP.Infrastructure.Persistence;
using ERP.Infrastructure.Application;
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
            .Validate(options => options.MemoryCostKiB >= 8192 && options.Iterations > 0 && options.Parallelism > 0 && options.HashLength >= 16,
                "PasswordSecurity configuration is invalid.")
            .ValidateOnStart();
        services.AddOptions<AuthenticationOptions>()
            .Bind(configuration.GetSection(AuthenticationOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.Issuer) && !string.IsNullOrWhiteSpace(options.Audience) &&
                System.Text.Encoding.UTF8.GetByteCount(options.SigningKey) >= 32 && options.AccessTokenMinutes is > 0 and <= 60 &&
                options.SessionDays is > 0 and <= 90 && options.ClockSkewSeconds is >= 0 and <= 120 &&
                !string.IsNullOrWhiteSpace(options.RefreshCookieName) && options.LoginFailureLimit > 0 && options.LoginWindowMinutes > 0 && options.LoginBlockMinutes > 0,
                "Authentication configuration is invalid. SigningKey must contain at least 256 bits and must come from environment configuration.")
            .ValidateOnStart();
        services.AddSingleton<IMariaDbConnectionFactory, MariaDbConnectionFactory>();
        services.AddSingleton<IDatabaseSessionFactory, MariaDbConnectionFactory>();
        services.AddSingleton<IPasswordHasher, Argon2idPasswordHasher>();
        services.AddSingleton<MariaDbHealthCheck>();
        services.AddSingleton<MariaDbMigrationRunner>();
        services.AddSingleton<AuthenticationRepository>();
        services.AddSingleton<IRefreshTokenGenerator, RefreshTokenGenerator>();
        services.AddSingleton<IAccessTokenService, HmacAccessTokenService>();
        services.AddSingleton<AuthenticationService>();
        return services;
    }
}
