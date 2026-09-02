using Dapper;
using ERP.Infrastructure.Database;
using MySqlConnector;

namespace ERP.AdminCli;

public sealed class MariaDbUserBootstrapRepository(IMariaDbConnectionFactory connections) : IUserBootstrapRepository
{
    public async Task<CreateUserConflict> CreateAsync(UserBootstrapRecord user, CancellationToken cancellationToken = default)
    {
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        try
        {
            var existing = await connection.QuerySingleOrDefaultAsync<ExistingUser>(new CommandDefinition(
                "SELECT email Email,user_name UserName FROM usuarios WHERE email=@Email OR user_name=@UserName LIMIT 1",
                new { user.Email, user.UserName }, cancellationToken: cancellationToken));
            if (existing is not null)
                return string.Equals(existing.Email, user.Email, StringComparison.OrdinalIgnoreCase)
                    ? CreateUserConflict.Email
                    : CreateUserConflict.UserName;

            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,data_cadastro,ativo) VALUES (@Id,@UserName,@PasswordHash,@Email,@CreatedAtUtc,1)",
                user, cancellationToken: cancellationToken));
            return CreateUserConflict.None;
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            return exception.Message.Contains("uq_usuarios_email", StringComparison.OrdinalIgnoreCase)
                ? CreateUserConflict.Email
                : CreateUserConflict.UserName;
        }
    }

    private sealed record ExistingUser(string Email, string UserName);
}
