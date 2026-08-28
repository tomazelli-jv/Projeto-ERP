using Dapper;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ERP.Infrastructure.Database;

public sealed class MariaDbHealthCheck(IMariaDbConnectionFactory connectionFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
            var command = new CommandDefinition("SELECT 1", cancellationToken: cancellationToken);
            var result = await connection.ExecuteScalarAsync<int>(command);
            return result == 1
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("MariaDB returned an unexpected readiness result.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy("MariaDB is not ready.", exception);
        }
    }
}
