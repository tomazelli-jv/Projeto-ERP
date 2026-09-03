using System.Net.Mail;
using Dapper;
using ERP.Infrastructure.Database;

namespace ERP.AdminCli;

// Comando separado atende instalações bootstrapadas anteriormente sem alterar empresa ou funcionário existentes.
public sealed class EnsureRbacService(IMariaDbConnectionFactory connections)
{
    // Localiza o usuário por e-mail normalizado e aplica somente catálogo e associação ao Administrador.
    public async Task<string> EnsureAsync(string? value, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(value);
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            // FOR UPDATE serializa execuções administrativas concorrentes para a mesma identidade.
            var userId = await connection.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
                "SELECT CAST(id_usuario AS CHAR(36)) FROM usuarios WHERE email=@Email LIMIT 1 FOR UPDATE",
                new { Email = email }, transaction, cancellationToken: cancellationToken));
            if (userId is null) throw new BootstrapCompanyConflictException("Não existe um usuário cadastrado com este e-mail.");
            await MariaDbRbacBootstrapper.EnsureAdministratorAsync(connection, transaction, userId, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return email;
        }
        catch
        {
            // Nenhuma parte do catálogo ou vínculo fica persistida quando a operação administrativa falha.
            if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    // A política de e-mail é idêntica aos demais comandos e impede UUID manual ou identidade hardcoded.
    private static string NormalizeEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length is 0 or > 254 || !MailAddress.TryCreate(email, out var parsed) ||
            !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
            throw new BootstrapCompanyValidationException("Informe um e-mail válido.");
        return email;
    }
}
