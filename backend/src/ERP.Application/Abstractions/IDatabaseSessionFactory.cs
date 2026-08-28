using System.Data.Common;

namespace ERP.Application.Abstractions;

public interface IDatabaseSessionFactory
{
    ValueTask<DbConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}
