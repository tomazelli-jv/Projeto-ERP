using Dapper;
using ERP.Infrastructure.Database;

namespace ERP.Infrastructure.Migrations;

public sealed class DevelopmentSeeder(IMariaDbConnectionFactory connectionFactory)
{
    private static readonly (string Code, string Name, string Description, ulong Companies, ulong Branches, ulong Users)[] Plans =
    [
        ("STARTER", "Starter", "Plano inicial de desenvolvimento; não representa oferta comercial definitiva.", 1, 2, 5),
        ("PRO", "Pro", "Plano intermediário de desenvolvimento; não representa oferta comercial definitiva.", 3, 10, 25),
        ("BUSINESS", "Business", "Plano avançado de desenvolvimento; não representa oferta comercial definitiva.", 10, 50, 100)
    ];

    public async Task RunAsync(string environment, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Development seeds can only run when DOTNET_ENVIRONMENT=Development.");
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO system_metadata (metadata_key,metadata_value) VALUES ('development_seed','applied') ON DUPLICATE KEY UPDATE metadata_value='applied',updated_at=UTC_TIMESTAMP(6)",
                transaction: transaction, cancellationToken: cancellationToken));
            foreach (var plan in Plans)
            {
                var planId = await connection.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
                    "SELECT id FROM plans WHERE code=@Code LIMIT 1 FOR UPDATE", new { plan.Code }, transaction, cancellationToken: cancellationToken));
                planId ??= Guid.NewGuid().ToString();
                await connection.ExecuteAsync(new CommandDefinition(
                    "INSERT INTO plans (id,code,name,description,is_active,is_public) VALUES (@Id,@Code,@Name,@Description,1,1) ON DUPLICATE KEY UPDATE name=@Name,description=@Description,is_active=1,is_public=1,updated_at=UTC_TIMESTAMP(6)",
                    new { Id = planId, plan.Code, plan.Name, plan.Description }, transaction, cancellationToken: cancellationToken));
                foreach (var limit in new[] { (Key: "max_companies", Value: plan.Companies), (Key: "max_branches", Value: plan.Branches), (Key: "max_users", Value: plan.Users) })
                    await connection.ExecuteAsync(new CommandDefinition(
                        "INSERT INTO plan_limits (id,plan_id,`key`,`value`) VALUES (@Id,@PlanId,@Key,@Value) ON DUPLICATE KEY UPDATE `value`=@Value,updated_at=UTC_TIMESTAMP(6)",
                        new { Id = Guid.NewGuid().ToString(), PlanId = planId, limit.Key, limit.Value }, transaction, cancellationToken: cancellationToken));
            }
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
