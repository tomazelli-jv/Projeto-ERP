using Dapper;
using ERP.Infrastructure.Database;
using MySqlConnector;

namespace ERP.Infrastructure.Migrations;

public sealed class MariaDbMigrationRunner(IMariaDbConnectionFactory connectionFactory)
{
    private const string LockName = "tomazelli_erp_knex_migrations";

    public async Task<IReadOnlyList<(string Name, bool Applied)>> StatusAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await EnsureLedgerAsync(connection, cancellationToken);
        var applied = (await connection.QueryAsync<string>(new CommandDefinition(
            "SELECT `name` FROM `knex_migrations`", cancellationToken: cancellationToken))).ToHashSet(StringComparer.Ordinal);
        return MigrationCatalog.All.Select(migration => (migration.Name, applied.Contains(migration.Name))).ToArray();
    }

    public async Task<int> UpAsync(CancellationToken cancellationToken = default) =>
        await WithLockAsync(async (connection, token) =>
        {
            var applied = (await connection.QueryAsync<string>(new CommandDefinition(
                "SELECT `name` FROM `knex_migrations`", cancellationToken: token))).ToHashSet(StringComparer.Ordinal);
            var pending = MigrationCatalog.All.Where(migration => !applied.Contains(migration.Name)).ToArray();
            if (pending.Length == 0) return 0;

            var batch = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
                "SELECT COALESCE(MAX(`batch`), 0) + 1 FROM `knex_migrations`", cancellationToken: token));
            foreach (var migration in pending)
            {
                foreach (var statement in migration.UpStatements)
                    await connection.ExecuteAsync(new CommandDefinition(statement, cancellationToken: token));
                await connection.ExecuteAsync(new CommandDefinition(
                    "INSERT INTO `knex_migrations` (`name`, `batch`, `migration_time`) VALUES (@Name, @Batch, UTC_TIMESTAMP(6))",
                    new { migration.Name, Batch = batch }, cancellationToken: token));
            }
            return pending.Length;
        }, cancellationToken);

    public async Task<int> DownAsync(CancellationToken cancellationToken = default) =>
        await WithLockAsync(async (connection, token) =>
        {
            var latestBatch = await connection.ExecuteScalarAsync<int?>(new CommandDefinition(
                "SELECT MAX(`batch`) FROM `knex_migrations`", cancellationToken: token));
            if (latestBatch is null) return 0;
            var names = (await connection.QueryAsync<string>(new CommandDefinition(
                "SELECT `name` FROM `knex_migrations` WHERE `batch` = @Batch ORDER BY `id` DESC",
                new { Batch = latestBatch }, cancellationToken: token))).ToArray();
            foreach (var name in names)
            {
                var migration = MigrationCatalog.All.SingleOrDefault(candidate => candidate.Name == name)
                    ?? throw new InvalidOperationException($"Cannot roll back unknown migration '{name}'.");
                foreach (var statement in migration.DownStatements)
                    await connection.ExecuteAsync(new CommandDefinition(statement, cancellationToken: token));
                await connection.ExecuteAsync(new CommandDefinition(
                    "DELETE FROM `knex_migrations` WHERE `name` = @Name", new { Name = name }, cancellationToken: token));
            }
            return names.Length;
        }, cancellationToken);

    private async Task<T> WithLockAsync<T>(Func<MySqlConnection, CancellationToken, Task<T>> action, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await EnsureLedgerAsync(connection, cancellationToken);
        var acquired = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT GET_LOCK(@Name, 30)", new { Name = LockName }, cancellationToken: cancellationToken));
        if (acquired != 1) throw new TimeoutException("Could not acquire the database migration lock.");
        try
        {
            var rowLocked = await connection.ExecuteAsync(new CommandDefinition(
                "UPDATE `knex_migrations_lock` SET `is_locked` = 1 WHERE `index` = 1 AND `is_locked` = 0",
                cancellationToken: cancellationToken));
            if (rowLocked != 1) throw new InvalidOperationException("The Knex migration ledger is already locked.");
            return await action(connection, cancellationToken);
        }
        finally
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "UPDATE `knex_migrations_lock` SET `is_locked` = 0 WHERE `index` = 1"));
            await connection.ExecuteAsync(new CommandDefinition("SELECT RELEASE_LOCK(@Name)", new { Name = LockName }));
        }
    }

    private static async Task EnsureLedgerAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        await connection.ExecuteAsync(new CommandDefinition(
            "CREATE TABLE IF NOT EXISTS `knex_migrations` (`id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255), `batch` INT, `migration_time` DATETIME) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            cancellationToken: cancellationToken));
        await connection.ExecuteAsync(new CommandDefinition(
            "CREATE TABLE IF NOT EXISTS `knex_migrations_lock` (`index` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, `is_locked` INT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            cancellationToken: cancellationToken));
        await connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO `knex_migrations_lock` (`index`, `is_locked`) SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM `knex_migrations_lock` WHERE `index` = 1)",
            cancellationToken: cancellationToken));
    }
}
