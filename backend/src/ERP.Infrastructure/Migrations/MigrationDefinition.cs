namespace ERP.Infrastructure.Migrations;

public sealed record MigrationDefinition(
    string Name,
    IReadOnlyList<string> UpStatements,
    IReadOnlyList<string> DownStatements);
