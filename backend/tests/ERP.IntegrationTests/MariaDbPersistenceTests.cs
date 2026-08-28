using Dapper;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.IntegrationTests;

[Collection(DatabaseCollection.Name)]
public sealed class MariaDbPersistenceTests(DatabaseFixture database)
{
    [Fact]
    public async Task Runner_PreservesKnexLedger_RollsBack_Reapplies_AndSerializes()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        var runner = new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource));

        await runner.UpAsync();
        var initial = await runner.StatusAsync();
        Assert.Equal(MigrationCatalog.All.Select(item => item.Name), initial.Select(item => item.Name));
        Assert.All(initial, item => Assert.True(item.Applied));

        Assert.Equal(MigrationCatalog.All.Count, await runner.DownAsync());
        Assert.All(await runner.StatusAsync(), item => Assert.False(item.Applied));
        Assert.Equal(MigrationCatalog.All.Count, await runner.UpAsync());

        var concurrent = await Task.WhenAll(runner.UpAsync(), runner.UpAsync());
        Assert.Equal(0, concurrent.Sum());

        await using var connection = await dataSource.OpenConnectionAsync();
        var names = (await connection.QueryAsync<string>("SELECT name FROM knex_migrations ORDER BY id")).ToArray();
        Assert.Equal(MigrationCatalog.All.Select(item => item.Name), names);
        Assert.Equal(0, await connection.ExecuteScalarAsync<int>("SELECT is_locked FROM knex_migrations_lock WHERE `index`=1"));
    }

    [Fact]
    public async Task Repositories_UseExistingTransaction_AndRollbackWithoutPartialRecords()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        var runner = new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource));
        await runner.UpAsync();
        var repository = new OnboardingRepository();
        var suffix = Guid.NewGuid().ToString("N");
        var planId = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid().ToString();

        await using (var connection = await dataSource.OpenConnectionAsync())
        {
            await connection.ExecuteAsync("INSERT INTO plans (id,code,name,is_active,is_public) VALUES (@Id,@Code,'Test',1,1)", new { Id = planId, Code = $"test-{suffix}" });
            await using var transaction = await connection.BeginTransactionAsync();
            var plan = await repository.FindPlanByCodeAsync(connection, transaction, $"test-{suffix}", CancellationToken.None);
            Assert.Equal(planId, plan?.Id);
            await repository.CreateTenantAsync(connection, transaction,
                new TenantWrite(tenantId, "Tenant", $"tenant-{suffix}", "active", "America/Sao_Paulo", "pt-BR"), CancellationToken.None);
            await transaction.RollbackAsync();
        }

        await using var verification = await dataSource.OpenConnectionAsync();
        Assert.Equal(0, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM tenants WHERE id=@Id", new { Id = tenantId }));
    }

    [Fact]
    public async Task PasswordRepository_WritesAndConsumesTokenAtomically()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        var repository = new PasswordSetupRepository();
        var userId = Guid.NewGuid().ToString();
        var tokenId = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;

        await using var connection = await dataSource.OpenConnectionAsync();
        await connection.ExecuteAsync("INSERT INTO users (id,name,email) VALUES (@Id,'Test',@Email)", new { Id = userId, Email = $"{userId}@example.test" });
        await using var transaction = await connection.BeginTransactionAsync();
        await repository.CreateTokenAsync(connection, transaction,
            new PasswordSetupTokenWrite(tokenId, userId, new string('a', 64), "initial_password", now.AddHours(1), now), CancellationToken.None);
        var token = await repository.FindTokenByHashForUpdateAsync(connection, transaction, new string('a', 64), CancellationToken.None);
        Assert.Equal(userId, token?.UserId);
        Assert.Equal(1, await repository.MarkTokenUsedAsync(connection, transaction, tokenId, now.AddMinutes(1), CancellationToken.None));
        await transaction.CommitAsync();
    }

    [Fact]
    public async Task Factory_OpensAndAsynchronouslyDisposesConnection()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        var factory = new MariaDbConnectionFactory(dataSource);
        var connection = await factory.OpenConnectionAsync();
        Assert.Equal(System.Data.ConnectionState.Open, connection.State);
        await connection.DisposeAsync();
        Assert.Equal(System.Data.ConnectionState.Closed, connection.State);
    }
}
