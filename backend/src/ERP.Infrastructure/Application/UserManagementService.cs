using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Domain.Business;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.Infrastructure.Application;

// Service coordena autorização empresarial, transações e invariantes sem confiar em IDs de empresa do cliente.
public sealed class UserManagementService(
    IMariaDbConnectionFactory connections,
    UserManagementRepository repository,
    IPasswordHasher passwordHasher)
{
    public async Task<IReadOnlyList<ManagedUserListItem>> ListUsersAsync(string actorId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, null, actorId, false, token);
        return await repository.ListUsersAsync(connection, context.EmpresaId, token);
    }

    public async Task<ManagedUserDetail> FindUserAsync(string actorId, string userId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, null, actorId, false, token);
        var row = await repository.FindUserAsync(connection, null, context.EmpresaId, userId, false, token) ?? throw UserManagementErrors.UserNotFound();
        return await DetailAsync(connection, row, token);
    }

    public async Task<IReadOnlyList<ManagedEmployeeSummary>> ListEmployeesAsync(string actorId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, null, actorId, false, token);
        return await repository.ListEmployeesAsync(connection, context.EmpresaId, token);
    }

    public async Task<ManagedEmployeeDetail> FindEmployeeAsync(string actorId, string employeeId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, null, actorId, false, token);
        var row = await repository.FindEmployeeAsync(connection, null, context.EmpresaId, employeeId, false, token) ?? throw UserManagementErrors.EmployeeNotFound();
        return new(row.IdFuncionario, row.Nome, row.IdUsuario, await repository.ListEmployeeStoresAsync(connection, context.EmpresaId, row.IdFuncionario, token));
    }

    public async Task<IReadOnlyList<ManagedProfile>> ListProfilesAsync(string actorId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        _ = await RequiredContextAsync(connection, null, actorId, false, token);
        return await repository.ListProfilesAsync(connection, token);
    }

    public async Task<IReadOnlyList<ManagedStore>> ListStoresAsync(string actorId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, null, actorId, false, token);
        return await repository.ListBusinessStoresAsync(connection, context.EmpresaId, token);
    }

    // Criação grava credencial, funcionário, perfil e lojas em uma única transação atômica.
    public async Task<ManagedUserDetail> CreateAsync(string actorId, CreateUserEmployeeRequest? request, CancellationToken token)
    {
        var input = UserManagementInput.Validate(request);
        var hash = await passwordHasher.HashAsync(input.Password, token);
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        var userId = Guid.NewGuid().ToString();
        var employeeId = Guid.NewGuid().ToString();
        try
        {
            var context = await RequiredContextAsync(connection, transaction, actorId, true, token);
            _ = await repository.FindOfficialProfileAsync(connection, transaction, input.ProfileId, token) ?? throw UserManagementErrors.ProfileNotFound();
            await ValidateStoresAsync(connection, transaction, context.EmpresaId, null, input.StoreIds, token);
            await repository.InsertUserAsync(connection, transaction, userId, input, hash, token);
            await repository.InsertEmployeeAsync(connection, transaction, employeeId, userId, context.EmpresaId, input.EmployeeName, token);
            await repository.ReplaceOfficialProfileAsync(connection, transaction, userId, input.ProfileId, token);
            await repository.ReplaceStoresAsync(connection, transaction, employeeId, context.EmpresaId, input.StoreIds, token);
            await transaction.CommitAsync(token);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            if (exception.Message.Contains("uq_usuarios_email", StringComparison.OrdinalIgnoreCase)) throw UserManagementErrors.EmailExists();
            if (exception.Message.Contains("uq_usuarios_user_name", StringComparison.OrdinalIgnoreCase)) throw UserManagementErrors.UserNameExists();
            throw;
        }
        catch
        {
            if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
        return await FindUserAsync(actorId, userId, token);
    }

    // Alteração de status bloqueia auto-inativação e revoga todas as sessões dentro da mesma transação.
    public async Task<ManagedUserDetail> UpdateUserAsync(string actorId, string userId, UpdateManagedUserRequest? request, CancellationToken token)
    {
        var input = UserManagementInput.Validate(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            var context = await RequiredContextAsync(connection, transaction, actorId, true, token);
            var current = await repository.FindUserAsync(connection, transaction, context.EmpresaId, userId, true, token) ?? throw UserManagementErrors.UserNotFound();
            if (current.Ativo && !input.Active)
            {
                if (string.Equals(actorId, userId, StringComparison.OrdinalIgnoreCase)) throw UserManagementErrors.SelfDeactivationForbidden();
                if (current.IdPerfil is not null && await repository.CountOtherActiveAdministratorsAsync(connection, transaction, context.EmpresaId, userId, token) == 0)
                    throw UserManagementErrors.LastAdministratorRequired();
            }
            await repository.UpdateUserAsync(connection, transaction, userId, input, token);
            if (current.Ativo && !input.Active) await repository.RevokeSessionsAsync(connection, transaction, userId, DateTime.UtcNow, token);
            await transaction.CommitAsync(token);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            if (exception.Message.Contains("uq_usuarios_email", StringComparison.OrdinalIgnoreCase)) throw UserManagementErrors.EmailExists();
            if (exception.Message.Contains("uq_usuarios_user_name", StringComparison.OrdinalIgnoreCase)) throw UserManagementErrors.UserNameExists();
            throw;
        }
        catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; }
        return await FindUserAsync(actorId, userId, token);
    }

    public async Task<ManagedEmployeeDetail> UpdateEmployeeAsync(string actorId, string employeeId, UpdateManagedEmployeeRequest? request, CancellationToken token)
    {
        var name = UserManagementInput.ValidateEmployee(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, null, actorId, false, token);
        if (await repository.UpdateEmployeeAsync(connection, null, employeeId, context.EmpresaId, name, token) == 0) throw UserManagementErrors.EmployeeNotFound();
        return await FindEmployeeAsync(actorId, employeeId, token);
    }

    // Perfil é validado como oficial; nesta fase a única seleção possível é Administrador.
    public async Task<ManagedUserDetail> UpdateProfileAsync(string actorId, string userId, UpdateManagedProfileRequest? request, CancellationToken token)
    {
        var profileId = UserManagementInput.ValidateProfile(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            var context = await RequiredContextAsync(connection, transaction, actorId, true, token);
            _ = await repository.FindUserAsync(connection, transaction, context.EmpresaId, userId, true, token) ?? throw UserManagementErrors.UserNotFound();
            _ = await repository.FindOfficialProfileAsync(connection, transaction, profileId, token) ?? throw UserManagementErrors.ProfileNotFound();
            await repository.ReplaceOfficialProfileAsync(connection, transaction, userId, profileId, token);
            await transaction.CommitAsync(token);
        }
        catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; }
        return await FindUserAsync(actorId, userId, token);
    }

    // Lojas funcionam como substituição completa, validada e bloqueada antes de modificar vínculos.
    public async Task<ManagedEmployeeDetail> UpdateStoresAsync(string actorId, string employeeId, UpdateManagedStoresRequest? request, CancellationToken token)
    {
        var ids = UserManagementInput.ValidateStores(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            var context = await RequiredContextAsync(connection, transaction, actorId, true, token);
            _ = await repository.FindEmployeeAsync(connection, transaction, context.EmpresaId, employeeId, true, token) ?? throw UserManagementErrors.EmployeeNotFound();
            await ValidateStoresAsync(connection, transaction, context.EmpresaId, employeeId, ids, token);
            await repository.ReplaceStoresAsync(connection, transaction, employeeId, context.EmpresaId, ids, token);
            await transaction.CommitAsync(token);
        }
        catch { if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None); throw; }
        return await FindEmployeeAsync(actorId, employeeId, token);
    }

    private async Task<BusinessContextRecord> RequiredContextAsync(MySqlConnection connection, MySqlTransaction? transaction, string actorId, bool forUpdate, CancellationToken token) =>
        await repository.FindContextAsync(connection, transaction, actorId, forUpdate, token) ?? throw BusinessErrors.ContextRequired();

    private async Task ValidateStoresAsync(MySqlConnection connection, MySqlTransaction transaction, string empresaId, string? employeeId, IReadOnlyList<string> ids, CancellationToken token)
    {
        if (await repository.CountAssignableStoresAsync(connection, transaction, empresaId, employeeId, ids, token) != ids.Count)
            throw UserManagementErrors.StoreOutsideContext();
    }

    private async Task<ManagedUserDetail> DetailAsync(MySqlConnection connection, UserDetailRow row, CancellationToken token)
    {
        var stores = await repository.ListEmployeeStoresAsync(connection, row.EmpresaId, row.IdFuncionario, token);
        var employee = new ManagedEmployeeDetail(row.IdFuncionario, row.NomeFuncionario, row.IdUsuario, stores);
        var profile = row.IdPerfil is null ? null : new ManagedProfile(row.IdPerfil, row.PerfilNome!);
        return new(row.IdUsuario, row.UserName, row.Email, row.Ativo, row.DataCadastro, employee, profile, stores);
    }
}
