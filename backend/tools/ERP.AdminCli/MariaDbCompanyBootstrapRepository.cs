using Dapper;
using ERP.Infrastructure.Database;
using MySqlConnector;

namespace ERP.AdminCli;

// Implementa o bootstrap no mesmo acesso MariaDB usado pelo restante da aplicação, sem conexão ou configuração paralela.
public sealed class MariaDbCompanyBootstrapRepository(IMariaDbConnectionFactory connections) : ICompanyBootstrapRepository
{
    // A transação impede que uma empresa permaneça no banco caso a criação do funcionário falhe.
    public async Task<BootstrapCompanyOutcome> BootstrapAsync(
        BootstrapCompanyInput input,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            // O bloqueio da identidade serializa bootstraps concorrentes para o mesmo usuário e usa somente colunas necessárias.
            var userId = await connection.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
                "SELECT CAST(id_usuario AS CHAR(36)) FROM usuarios WHERE email=@Email LIMIT 1 FOR UPDATE",
                new { input.Email }, transaction, cancellationToken: cancellationToken));
            if (userId is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BootstrapCompanyOutcome.UserNotFound;
            }

            // A consulta explícita evita mover silenciosamente um funcionário ou criar outra empresa para a mesma identidade.
            var employeeExists = await connection.ExecuteScalarAsync<bool>(new CommandDefinition(
                "SELECT EXISTS(SELECT 1 FROM funcionario WHERE id_usuario=@UserId)",
                new { UserId = userId }, transaction, cancellationToken: cancellationToken));
            if (employeeExists)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BootstrapCompanyOutcome.BusinessContextAlreadyConfigured;
            }

            // UUIDs são gerados somente após as verificações protegidas e permanecem internos ao fluxo administrativo.
            var companyId = Guid.NewGuid().ToString();
            var employeeId = Guid.NewGuid().ToString();

            // A empresa nasce ativa e deixa data_cadastro sob responsabilidade do default definido pelo banco.
            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO empresa (id_empresa,nome,ativo) VALUES (@CompanyId,@CompanyName,1)",
                new { CompanyId = companyId, input.CompanyName }, transaction, cancellationToken: cancellationToken));

            // O funcionário conecta a identidade existente à nova empresa sem criar loja ou funcionario_loja.
            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@EmployeeId,@UserId,@CompanyId,@EmployeeName)",
                new { EmployeeId = employeeId, UserId = userId, CompanyId = companyId, input.EmployeeName },
                transaction, cancellationToken: cancellationToken));

            await transaction.CommitAsync(cancellationToken);
            return BootstrapCompanyOutcome.Created;
        }
        catch (MySqlException exception) when (
            exception.Number == 1062 &&
            exception.Message.Contains("uq_funcionario_id_usuario", StringComparison.OrdinalIgnoreCase))
        {
            // A constraint única é uma segunda barreira caso outro processo tenha configurado o usuário concorrentemente.
            await transaction.RollbackAsync(CancellationToken.None);
            return BootstrapCompanyOutcome.BusinessContextAlreadyConfigured;
        }
        catch
        {
            // Rollback explícito documenta e garante atomicidade antes de devolver a falha sanitizada ao ponto de entrada.
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
