using Dapper;
using ERP.AdminCli;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Exercita SQL, constraints e rollback reais apenas quando o ambiente habilita explicitamente MariaDB de integração.
[Collection(DatabaseCollection.Name)]
public sealed class CompanyBootstrapTests(DatabaseFixture database)
{
    [Fact]
    public async Task Bootstrap_PersistsCompanyEmployeeLink_AndRejectsSecondContext()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        var repository = new MariaDbCompanyBootstrapRepository(new MariaDbConnectionFactory(dataSource));
        var suffix = Guid.NewGuid().ToString("N");
        var userId = Guid.NewGuid().ToString();
        var email = $"bootstrap-{suffix}@example.test";
        var companyName = $"Empresa Bootstrap {suffix}";

        // A identidade é pré-condição do comando e não é criada pelo próprio bootstrap empresarial.
        await using (var setup = await dataSource.OpenConnectionAsync())
            await setup.ExecuteAsync(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,'hash-seguro',@Email,1)",
                new { Id = userId, UserName = $"bootstrap.{suffix}", Email = email });

        try
        {
            var outcome = await repository.BootstrapAsync(new(email, companyName, "Funcionário Bootstrap"));
            Assert.Equal(BootstrapCompanyOutcome.Created, outcome);

            // A junção comprova o vínculo usuário -> funcionário -> empresa e a ausência de registros parciais.
            await using var connection = await dataSource.OpenConnectionAsync();
            var persisted = await connection.QuerySingleAsync<PersistedContext>(
                "SELECT CAST(f.id_usuario AS CHAR(36)) UserId,CAST(f.id_empresa AS CHAR(36)) CompanyId,e.nome CompanyName,f.nome EmployeeName FROM funcionario f INNER JOIN empresa e ON e.id_empresa=f.id_empresa WHERE f.id_usuario=@UserId",
                new { UserId = userId });
            Assert.Equal(userId, persisted.UserId);
            Assert.Equal(companyName, persisted.CompanyName);
            Assert.Equal("Funcionário Bootstrap", persisted.EmployeeName);
            Assert.Equal(0, await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM funcionario_loja WHERE id_funcionario IN (SELECT id_funcionario FROM funcionario WHERE id_usuario=@UserId)",
                new { UserId = userId }));

            var repeated = await repository.BootstrapAsync(new(email, "Outra Empresa", "Outro Funcionário"));
            Assert.Equal(BootstrapCompanyOutcome.BusinessContextAlreadyConfigured, repeated);
            Assert.Equal(1, await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM funcionario WHERE id_usuario=@UserId", new { UserId = userId }));
        }
        finally
        {
            // Limpeza respeita as FKs e mantém o banco compartilhado isolado para os demais cenários.
            await using var cleanup = await dataSource.OpenConnectionAsync();
            await cleanup.ExecuteAsync("DELETE FROM funcionario WHERE id_usuario=@UserId", new { UserId = userId });
            await cleanup.ExecuteAsync("DELETE FROM empresa WHERE nome=@CompanyName", new { CompanyName = companyName });
            await cleanup.ExecuteAsync("DELETE FROM usuarios WHERE id_usuario=@UserId", new { UserId = userId });
        }
    }

    [Fact]
    public async Task Bootstrap_MissingUserDoesNotCreateCompany_AndEmployeeFailureRollsBackCompany()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        var repository = new MariaDbCompanyBootstrapRepository(new MariaDbConnectionFactory(dataSource));
        var suffix = Guid.NewGuid().ToString("N");
        var missingCompany = $"Empresa Ausente {suffix}";

        var missing = await repository.BootstrapAsync(new($"missing-{suffix}@example.test", missingCompany, "Funcionário"));
        Assert.Equal(BootstrapCompanyOutcome.UserNotFound, missing);

        var userId = Guid.NewGuid().ToString();
        var email = $"rollback-{suffix}@example.test";
        var rollbackCompany = $"Empresa Rollback {suffix}";
        await using (var setup = await dataSource.OpenConnectionAsync())
            await setup.ExecuteAsync(
                "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,'hash-seguro',@Email,1)",
                new { Id = userId, UserName = $"rollback.{suffix}", Email = email });

        try
        {
            // NULL viola a coluna obrigatória após o INSERT da empresa e comprova rollback sem depender do SQL mode.
            await Assert.ThrowsAsync<MySqlException>(() =>
                repository.BootstrapAsync(new(email, rollbackCompany, null)));

            await using var connection = await dataSource.OpenConnectionAsync();
            Assert.Equal(0, await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM empresa WHERE nome IN (@MissingCompany,@RollbackCompany)",
                new { MissingCompany = missingCompany, RollbackCompany = rollbackCompany }));
            Assert.Equal(0, await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM funcionario WHERE id_usuario=@UserId", new { UserId = userId }));
        }
        finally
        {
            // Mesmo em falha de asserção, a identidade auxiliar não permanece no banco de integração.
            await using var cleanup = await dataSource.OpenConnectionAsync();
            await cleanup.ExecuteAsync("DELETE FROM funcionario WHERE id_usuario=@UserId", new { UserId = userId });
            await cleanup.ExecuteAsync("DELETE FROM empresa WHERE nome=@CompanyName", new { CompanyName = rollbackCompany });
            await cleanup.ExecuteAsync("DELETE FROM usuarios WHERE id_usuario=@UserId", new { UserId = userId });
        }
    }

    // Record local materializa somente os campos necessários para validar o relacionamento persistido.
    private sealed record PersistedContext(string UserId, string CompanyId, string CompanyName, string EmployeeName);
}
