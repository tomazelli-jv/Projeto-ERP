using MySqlConnector;

using ERP.Application.Abstractions;
using System.Data.Common;

namespace ERP.Infrastructure.Database;

public sealed class MariaDbConnectionFactory(MySqlDataSource dataSource) : IMariaDbConnectionFactory, IDatabaseSessionFactory
{
    public async ValueTask<MySqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        return await dataSource.OpenConnectionAsync(cancellationToken);
    }

    async ValueTask<DbConnection> IDatabaseSessionFactory.OpenConnectionAsync(CancellationToken cancellationToken)
        => await OpenConnectionAsync(cancellationToken);
}
