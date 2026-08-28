using MySqlConnector;

namespace ERP.Infrastructure.Database;

public interface IMariaDbConnectionFactory
{
    ValueTask<MySqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}
