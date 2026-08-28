using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
var connectionString = configuration.GetConnectionString("MariaDb");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("ConnectionStrings__MariaDb is required.");
    return 2;
}

await using var dataSource = new MySqlDataSourceBuilder(connectionString).Build();
var runner = new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource));
var seeder = new DevelopmentSeeder(new MariaDbConnectionFactory(dataSource));
var command = args.FirstOrDefault()?.ToLowerInvariant() ?? "status";

try
{
    switch (command)
    {
        case "up":
            Console.WriteLine($"Applied {await runner.UpAsync()} migration(s).");
            break;
        case "down":
            Console.WriteLine($"Rolled back {await runner.DownAsync()} migration(s).");
            break;
        case "status":
            foreach (var migration in await runner.StatusAsync())
                Console.WriteLine($"{(migration.Applied ? "up" : "down")}\t{migration.Name}");
            break;
        case "seed":
            await seeder.RunAsync(configuration["DOTNET_ENVIRONMENT"] ?? configuration["ASPNETCORE_ENVIRONMENT"] ?? string.Empty);
            Console.WriteLine("Development seeds completed.");
            break;
        default:
            Console.Error.WriteLine("Usage: ERP.Migrations [up|down|status|seed]");
            return 2;
    }
    return 0;
}
catch (Exception exception)
{
    Console.Error.WriteLine($"Migration command failed: {exception.Message}");
    return 1;
}
