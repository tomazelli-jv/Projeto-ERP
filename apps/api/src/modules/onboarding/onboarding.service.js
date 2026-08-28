import {
  createUuid,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  onboardingInputSchema,
  ONBOARDING_TRIAL_DAYS,
  PLAN_LIMIT_KEY_VALUES
} from '@tomazelli/shared';
import { mapOnboardingDatabaseError, onboardingError } from './onboarding.errors.js';

const MINIMUM_ONBOARDING_LIMIT = 1;
const MAX_TRANSACTION_ATTEMPTS = 3;
const RETRYABLE_TRANSACTION_ERROR_CODES = new Set(['ER_CHECKREAD', 'ER_LOCK_DEADLOCK']);

export class OnboardingService {
  constructor({ database, repository, passwordSetupTokenService, logger, clock = () => new Date() }) {
    this.database = database;
    this.repository = repository;
    this.passwordSetupTokenService = passwordSetupTokenService;
    this.logger = logger;
    this.clock = clock;
  }

  async onboard(rawInput, context = {}) {
    const input = onboardingInputSchema.parse(rawInput);
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.#executeTransaction(input, context);
      } catch (error) {
        if (!RETRYABLE_TRANSACTION_ERROR_CODES.has(error?.code) || attempt === MAX_TRANSACTION_ATTEMPTS)
          throw error;
        this.logger.warn(
          { requestId: context.requestId, event: 'tenant_onboarding', attempt },
          'Retrying onboarding after database deadlock'
        );
      }
    }
    throw new Error('Onboarding transaction attempts exhausted');
  }

  async #executeTransaction(input, context) {
    const connection = await this.database.getConnection();
    const logContext = { requestId: context.requestId, event: 'tenant_onboarding' };
    this.logger.info(logContext, 'Onboarding started');

    try {
      await connection.beginTransaction();
      const plan = await this.#getEligiblePlan(connection, input.planCode);
      await this.#validateMinimumLimits(connection, plan.id);

      const now = this.clock();
      const trialEndsAt = new Date(now.getTime() + ONBOARDING_TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const tenantId = createUuid();
      const companyId = createUuid();
      const branchId = createUuid();

      await this.repository.createTenant(connection, {
        id: tenantId,
        name: input.tenant.name,
        slug: input.tenant.slug,
        status: 'active',
        timezone: DEFAULT_TIMEZONE,
        locale: DEFAULT_LOCALE
      });
      await this.repository.createCompany(connection, {
        id: companyId,
        tenantId,
        legalName: input.company.legalName,
        tradeName: input.company.tradeName ?? null,
        taxIdRoot: input.company.taxId.slice(0, 8),
        status: 'active'
      });
      await this.repository.createBranch(connection, {
        id: branchId,
        tenantId,
        companyId,
        code: input.branch.code,
        legalName: input.branch.legalName,
        tradeName: input.branch.tradeName ?? null,
        taxId: input.company.taxId,
        isHeadquarters: true,
        status: 'active',
        email: input.branch.email ?? null,
        phone: input.branch.phone ?? null
      });

      if (input.branch.address) {
        await this.repository.createBranchAddress(connection, {
          id: createUuid(),
          tenantId,
          branchId,
          ...input.branch.address,
          complement: input.branch.address.complement ?? null
        });
      }

      const { user: owner, isLocked: ownerIsLocked } = await this.#findOrCreateOwner(connection, input.owner);
      const passwordSetupIssuance = await this.passwordSetupTokenService.issueForUser(
        connection,
        owner.id,
        ownerIsLocked ? { lockedUser: owner } : undefined
      );
      await this.repository.createMembership(connection, {
        id: createUuid(),
        tenantId,
        userId: owner.id,
        status: 'active',
        isOwner: true,
        joinedAt: now
      });

      const subscriptionId = createUuid();
      await this.repository.createSubscription(connection, {
        id: subscriptionId,
        tenantId,
        planId: plan.id,
        status: 'trialing',
        startsAt: now,
        trialEndsAt,
        endsAt: null
      });

      await connection.commit();
      this.logger.info(logContext, 'Onboarding completed');
      try {
        await this.passwordSetupTokenService.deliver(passwordSetupIssuance);
      } catch {
        this.logger.warn(
          { ...logContext, code: 'PASSWORD_SETUP_DELIVERY_FAILED' },
          'Password setup delivery failed'
        );
      }
      return {
        tenant: { id: tenantId, name: input.tenant.name, slug: input.tenant.slug },
        company: { id: companyId, legalName: input.company.legalName },
        branch: {
          id: branchId,
          code: input.branch.code,
          tradeName: input.branch.tradeName ?? null
        },
        owner: { id: owner.id, name: owner.name, email: owner.email },
        subscription: { id: subscriptionId, status: 'trialing', trialEndsAt: trialEndsAt.toISOString() }
      };
    } catch (error) {
      await connection.rollback();
      const mappedError = mapOnboardingDatabaseError(error);
      this.logger.warn({ ...logContext, code: mappedError.code ?? 'ONBOARDING_FAILED' }, 'Onboarding failed');
      throw mappedError;
    } finally {
      connection.release();
    }
  }

  async #getEligiblePlan(connection, code) {
    const plan = await this.repository.findPlanByCode(connection, code);
    if (!plan || !plan.isActive || !plan.isPublic) {
      throw onboardingError('PLAN_NOT_AVAILABLE');
    }
    return plan;
  }

  async #validateMinimumLimits(connection, planId) {
    const rows = await this.repository.findPlanLimits(connection, planId);
    const limits = new Map(rows.map((row) => [row.key, Number(row.value)]));
    const valid = PLAN_LIMIT_KEY_VALUES.every((key) => {
      const value = limits.get(key);
      return Number.isSafeInteger(value) && value >= MINIMUM_ONBOARDING_LIMIT;
    });
    if (!valid) throw onboardingError('TENANT_LIMIT_CONFIGURATION_INVALID');
  }

  async #findOrCreateOwner(connection, ownerInput) {
    const user = { id: createUuid(), ...ownerInput, phone: ownerInput.phone ?? null };
    await this.repository.createUserIfMissing(connection, user);
    const canonicalUser = await this.repository.findUserByEmailForUpdate(connection, ownerInput.email);
    if (!canonicalUser) throw new Error('Onboarding owner was not found after idempotent creation');
    return { user: canonicalUser, isLocked: true };
  }
}
