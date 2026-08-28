# ASP.NET Core migration runner

The .NET runner deliberately shares the existing Knex ledger. It uses
`knex_migrations` and `knex_migrations_lock`, and records the exact JavaScript
filenames for migrations 001–007. Entity Framework migrations are not used.

Set `ConnectionStrings__MariaDb` and execute:

```shell
dotnet run --project backend/src/ERP.Migrations -- up
dotnet run --project backend/src/ERP.Migrations -- status
dotnet run --project backend/src/ERP.Migrations -- down
```

`up` applies every pending migration in one batch. `down` rolls back the most
recent batch. The ledger entry is written only after its migration statements
succeed. A MariaDB advisory lock plus the Knex lock row prevents concurrent
runners. DDL statements in MariaDB cause implicit commits, so a failed DDL
migration is not falsely recorded but may require operational inspection before
retrying, matching the risk profile of the original Knex migrations.
