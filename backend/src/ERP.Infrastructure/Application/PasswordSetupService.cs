using ERP.Application.Contracts;
using ERP.Infrastructure.Database;

namespace ERP.Infrastructure.Application;

public sealed class PasswordSetupService(IMariaDbConnectionFactory connectionFactory, PasswordSetupWorkflow workflow)
{
    public async Task<PasswordSetupResult> ExecuteAsync(PasswordSetupConfirmRequest request, CancellationToken cancellationToken)
    {
        var input = InputValidation.Validate(request);
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            await workflow.ConfirmAsync(connection, transaction, input.Token, input.Password, DateTime.UtcNow, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new(true);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
