using Dapper;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ERP.Infrastructure.Database;

public sealed class MariaDbHealthCheck(IMariaDbConnectionFactory connectionFactory) : IHealthCheck
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutSource.CancelAfter(Timeout);
            await using var connection = await connectionFactory.OpenConnectionAsync(timeoutSource.Token);
            var command = new CommandDefinition("SELECT 1", commandTimeout: (int)Timeout.TotalSeconds, cancellationToken: timeoutSource.Token);
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
