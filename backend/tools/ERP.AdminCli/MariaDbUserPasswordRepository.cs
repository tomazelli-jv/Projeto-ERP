using Dapper;
using ERP.Infrastructure.Database;

namespace ERP.AdminCli;

public sealed class MariaDbUserPasswordRepository(IMariaDbConnectionFactory connections) : IUserPasswordRepository
{
    public async Task<bool> UpdatePasswordAsync(string email, string passwordHash, CancellationToken cancellationToken = default)
    {
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        var affected = await connection.ExecuteAsync(new CommandDefinition(
            "UPDATE usuarios SET password_hash=@PasswordHash WHERE email=@Email",
            new { Email = email, PasswordHash = passwordHash },
            cancellationToken: cancellationToken));
        return affected == 1;
    }
}
