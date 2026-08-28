using Dapper;
using MySqlConnector;

namespace ERP.Infrastructure.Persistence;

public sealed record PlanRecord(string Id, string Code, bool IsActive, bool IsPublic);
public sealed record PlanLimitRecord(string Key, ulong Value);
public sealed record UserRecord(string Id, string Name, string Email, string? Phone);
public sealed record TenantWrite(string Id, string Name, string Slug, string Status, string Timezone, string Locale);
public sealed record CompanyWrite(string Id, string TenantId, string LegalName, string? TradeName, string? TaxIdRoot, string Status);
public sealed record BranchWrite(string Id, string TenantId, string CompanyId, string Code, string LegalName, string? TradeName, string? TaxId, bool IsHeadquarters, string Status, string? Email, string? Phone);
public sealed record BranchAddressWrite(string Id, string TenantId, string BranchId, string? PostalCode, string Street, string Number, string? Complement, string District, string City, string State, string CountryCode);
public sealed record UserWrite(string Id, string Name, string Email, string? Phone);
public sealed record MembershipWrite(string Id, string TenantId, string UserId, string Status, bool IsOwner, DateTime? JoinedAt);
public sealed record SubscriptionWrite(string Id, string TenantId, string PlanId, string Status, DateTime StartsAt, DateTime? TrialEndsAt, DateTime? EndsAt);

public sealed class OnboardingRepository
{
    public Task<PlanRecord?> FindPlanByCodeAsync(MySqlConnection connection, MySqlTransaction transaction, string code, CancellationToken cancellationToken) =>
        connection.QuerySingleOrDefaultAsync<PlanRecord>(Command(
            "SELECT id, code, is_active AS IsActive, is_public AS IsPublic FROM plans WHERE code = @Code LIMIT 1 LOCK IN SHARE MODE",
            new { Code = code }, transaction, cancellationToken));

    public async Task<IReadOnlyList<PlanLimitRecord>> FindPlanLimitsAsync(MySqlConnection connection, MySqlTransaction transaction, string planId, CancellationToken cancellationToken) =>
        (await connection.QueryAsync<PlanLimitRecord>(Command(
            "SELECT `key` AS `Key`, `value` AS `Value` FROM plan_limits WHERE plan_id = @PlanId",
            new { PlanId = planId }, transaction, cancellationToken))).AsList();

    public Task CreateTenantAsync(MySqlConnection connection, MySqlTransaction transaction, TenantWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO tenants (id,name,slug,status,timezone,locale) VALUES (@Id,@Name,@Slug,@Status,@Timezone,@Locale)", value, transaction, cancellationToken);

    public Task CreateCompanyAsync(MySqlConnection connection, MySqlTransaction transaction, CompanyWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO companies (id,tenant_id,legal_name,trade_name,tax_id_root,status) VALUES (@Id,@TenantId,@LegalName,@TradeName,@TaxIdRoot,@Status)", value, transaction, cancellationToken);

    public Task CreateBranchAsync(MySqlConnection connection, MySqlTransaction transaction, BranchWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO branches (id,tenant_id,company_id,code,legal_name,trade_name,tax_id,is_headquarters,status,email,phone) VALUES (@Id,@TenantId,@CompanyId,@Code,@LegalName,@TradeName,@TaxId,@IsHeadquarters,@Status,@Email,@Phone)", value, transaction, cancellationToken);

    public Task CreateBranchAddressAsync(MySqlConnection connection, MySqlTransaction transaction, BranchAddressWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO branch_addresses (id,tenant_id,branch_id,postal_code,street,number,complement,district,city,state,country_code) VALUES (@Id,@TenantId,@BranchId,@PostalCode,@Street,@Number,@Complement,@District,@City,@State,@CountryCode)", value, transaction, cancellationToken);

    public Task<UserRecord?> FindUserByEmailForUpdateAsync(MySqlConnection connection, MySqlTransaction transaction, string email, CancellationToken cancellationToken) =>
        connection.QuerySingleOrDefaultAsync<UserRecord>(Command(
            "SELECT id,name,email,phone FROM users WHERE email = @Email LIMIT 1 FOR UPDATE", new { Email = email }, transaction, cancellationToken));

    public Task CreateUserIfMissingAsync(MySqlConnection connection, MySqlTransaction transaction, UserWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO users (id,name,email,phone) VALUES (@Id,@Name,@Email,@Phone) ON DUPLICATE KEY UPDATE id=id", value, transaction, cancellationToken);

    public Task CreateMembershipAsync(MySqlConnection connection, MySqlTransaction transaction, MembershipWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO tenant_memberships (id,tenant_id,user_id,status,is_owner,joined_at) VALUES (@Id,@TenantId,@UserId,@Status,@IsOwner,@JoinedAt)", value, transaction, cancellationToken);

    public Task CreateSubscriptionAsync(MySqlConnection connection, MySqlTransaction transaction, SubscriptionWrite value, CancellationToken cancellationToken) => ExecuteAsync(connection,
        "INSERT INTO subscriptions (id,tenant_id,plan_id,status,starts_at,trial_ends_at,ends_at) VALUES (@Id,@TenantId,@PlanId,@Status,@StartsAt,@TrialEndsAt,@EndsAt)", value, transaction, cancellationToken);

    private static CommandDefinition Command(string sql, object parameters, MySqlTransaction transaction, CancellationToken token) =>
        new(sql, parameters, transaction, cancellationToken: token);

    private static async Task ExecuteAsync(MySqlConnection connection, string sql, object parameters, MySqlTransaction transaction, CancellationToken token) =>
        _ = await connection.ExecuteAsync(Command(sql, parameters, transaction, token));
}
