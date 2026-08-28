namespace ERP.IntegrationTests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class DatabaseCollection : ICollectionFixture<DatabaseFixture>
{
    public const string Name = "mariadb";
}

public sealed class DatabaseFixture
{
    public bool Enabled => string.Equals(Environment.GetEnvironmentVariable("DB_INTEGRATION_TESTS"), "true", StringComparison.OrdinalIgnoreCase);
    public string ConnectionString => Environment.GetEnvironmentVariable("ConnectionStrings__MariaDb")
        ?? throw new InvalidOperationException("ConnectionStrings__MariaDb is required for MariaDB integration tests.");
}
