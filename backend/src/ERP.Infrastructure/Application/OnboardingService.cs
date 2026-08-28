using ERP.Application.Contracts;
using ERP.Domain.Errors;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace ERP.Infrastructure.Application;

public sealed class OnboardingService(
    IMariaDbConnectionFactory connectionFactory,
    OnboardingRepository repository,
    PasswordSetupWorkflow passwordSetup,
    ILogger<OnboardingService> logger)
{
    private static readonly string[] RequiredLimits = ["max_companies", "max_branches", "max_users"];

    public async Task<OnboardingResult> ExecuteAsync(OnboardingRequest request, CancellationToken cancellationToken)
    {
        var input = InputValidation.Normalize(request);
        for (var attempt = 1; attempt <= 3; attempt++)
        {
            try { return await ExecuteAttemptAsync(input, cancellationToken); }
            catch (MySqlException exception) when (exception.Number is 1213 or 1020 && attempt < 3)
            {
                logger.LogWarning("Retrying tenant onboarding after transient database conflict. Attempt {Attempt}", attempt);
            }
        }
        throw new InvalidOperationException("Onboarding retry attempts exhausted.");
    }

    private async Task<OnboardingResult> ExecuteAttemptAsync(OnboardingRequest input, CancellationToken cancellationToken)
    {
        PasswordSetupIssuance? issuance = null;
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            var plan = await repository.FindPlanByCodeAsync(connection, transaction, input.PlanCode, cancellationToken);
            if (plan is null || !plan.IsActive || !plan.IsPublic) throw Error("PLAN_NOT_AVAILABLE", "O plano informado não está disponível.", 422);
            var limits = (await repository.FindPlanLimitsAsync(connection, transaction, plan.Id, cancellationToken)).ToDictionary(x => x.Key, x => x.Value);
            if (RequiredLimits.Any(key => !limits.TryGetValue(key, out var value) || value < 1))
                throw Error("TENANT_LIMIT_CONFIGURATION_INVALID", "O plano não suporta a estrutura inicial necessária.", 422);

            var now = DateTime.UtcNow;
            var tenantId = Guid.NewGuid().ToString(); var companyId = Guid.NewGuid().ToString(); var branchId = Guid.NewGuid().ToString();
            await repository.CreateTenantAsync(connection, transaction, new(tenantId, input.Tenant.Name, input.Tenant.Slug, "active", "America/Sao_Paulo", "pt-BR"), cancellationToken);
            await repository.CreateCompanyAsync(connection, transaction, new(companyId, tenantId, input.Company.LegalName, input.Company.TradeName, input.Company.TaxId[..8], "active"), cancellationToken);
            await repository.CreateBranchAsync(connection, transaction, new(branchId, tenantId, companyId, input.Branch.Code, input.Branch.LegalName, input.Branch.TradeName, input.Company.TaxId, true, "active", input.Branch.Email, input.Branch.Phone), cancellationToken);
            if (input.Branch.Address is { } address)
                await repository.CreateBranchAddressAsync(connection, transaction, new(Guid.NewGuid().ToString(), tenantId, branchId, address.PostalCode, address.Street, address.Number, address.Complement, address.District, address.City, address.State, address.CountryCode), cancellationToken);

            await repository.CreateUserIfMissingAsync(connection, transaction, new(Guid.NewGuid().ToString(), input.Owner.Name, input.Owner.Email, input.Owner.Phone), cancellationToken);
            var user = await repository.FindUserByEmailForUpdateAsync(connection, transaction, input.Owner.Email, cancellationToken)
                ?? throw new InvalidOperationException("Canonical onboarding user was not found.");
            await repository.CreateMembershipAsync(connection, transaction, new(Guid.NewGuid().ToString(), tenantId, user.Id, "active", true, now), cancellationToken);
            var subscriptionId = Guid.NewGuid().ToString();
            await repository.CreateSubscriptionAsync(connection, transaction, new(subscriptionId, tenantId, plan.Id, "trialing", now, now.AddDays(14), null), cancellationToken);
            issuance = await passwordSetup.IssueAsync(connection, transaction, user, now, cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            try { await passwordSetup.DeliverAsync(issuance, cancellationToken); }
            catch { logger.LogWarning("Password setup notification delivery failed after onboarding commit."); }
            return new(new(tenantId, input.Tenant.Name, input.Tenant.Slug), new(companyId, input.Company.LegalName), new(branchId, input.Branch.Code, input.Branch.TradeName), new(user.Id, user.Name, user.Email), new(subscriptionId, "trialing", now.AddDays(14)));
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw Map(exception);
        }
    }

    private static Exception Map(Exception exception)
    {
        if (exception is not MySqlException { Number: 1062 } mysql) return exception;
        var message = mysql.Message;
        if (message.Contains("uq_tenants_slug", StringComparison.Ordinal)) return Error("TENANT_SLUG_ALREADY_EXISTS", "Este endereço de conta já está em uso.", 409);
        if (message.Contains("uq_branches_tax_id", StringComparison.Ordinal)) return Error("CNPJ_ALREADY_REGISTERED", "Este CNPJ já está cadastrado.", 409);
        if (message.Contains("uq_memberships_tenant_user", StringComparison.Ordinal)) return Error("MEMBERSHIP_ALREADY_EXISTS", "O usuário já possui vínculo com esta conta.", 409);
        return Error("ONBOARDING_CONFLICT", "Já existe um cadastro conflitante.", 409);
    }
    private static DomainException Error(string code, string message, int status) => new(code, message, status);
}
