import { planLimitKeySchema, uuidSchema } from '@tomazelli/shared';

export class PlanLimitExceededError extends Error {
  constructor({ key, limit, currentUsage, requestedAmount }) {
    super(`Tenant limit exceeded: ${key}`);
    this.name = 'PlanLimitExceededError';
    this.code = 'TENANT_LIMIT_EXCEEDED';
    this.key = key;
    this.limit = limit;
    this.currentUsage = currentUsage;
    this.requestedAmount = requestedAmount;
  }
}

export class PlanLimitService {
  constructor(planLimitRepository) {
    this.planLimitRepository = planLimitRepository;
  }

  async getTenantLimit(tenantId, key) {
    uuidSchema.parse(tenantId);
    planLimitKeySchema.parse(key);
    return this.planLimitRepository.findCurrentLimit(tenantId, key);
  }

  async assertTenantLimit({ tenantId, key, currentUsage, requestedAmount = 1 }) {
    uuidSchema.parse(tenantId);
    planLimitKeySchema.parse(key);
    if (!Number.isSafeInteger(currentUsage) || currentUsage < 0) {
      throw new TypeError('currentUsage must be a non-negative safe integer');
    }
    if (!Number.isSafeInteger(requestedAmount) || requestedAmount < 1) {
      throw new TypeError('requestedAmount must be a positive safe integer');
    }

    const limit = await this.getTenantLimit(tenantId, key);
    if (limit === null) throw new Error(`Tenant has no current plan limit configured for: ${key}`);
    if (currentUsage + requestedAmount > limit) {
      throw new PlanLimitExceededError({ key, limit, currentUsage, requestedAmount });
    }
    return { allowed: true, limit, remaining: limit - currentUsage - requestedAmount };
  }
}
