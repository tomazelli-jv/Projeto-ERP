using MySqlConnector;

namespace ERP.Infrastructure.Database;

public sealed class MariaDbConnectionFactory(MySqlDataSource dataSource) : IMariaDbConnectionFactory
{
    public async ValueTask<MySqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        return await dataSource.OpenConnectionAsync(cancellationToken);
    }
}
