import { createUuid, PLAN_LIMIT_KEYS } from '@tomazelli/shared';
import { describe, expect, it, vi } from 'vitest';
import { PlanLimitExceededError, PlanLimitService } from '../src/modules/plans/plan-limit.service.js';

describe('PlanLimitService', () => {
  const tenantId = createUuid();

  it('reads the current tenant plan limit', async () => {
    const repository = { findCurrentLimit: vi.fn().mockResolvedValue(3) };
    const service = new PlanLimitService(repository);
    await expect(service.getTenantLimit(tenantId, PLAN_LIMIT_KEYS.MAX_COMPANIES)).resolves.toBe(3);
    expect(repository.findCurrentLimit).toHaveBeenCalledWith(tenantId, 'max_companies');
  });

  it('allows usage below the contracted limit', async () => {
    const service = new PlanLimitService({ findCurrentLimit: vi.fn().mockResolvedValue(5) });
    await expect(
      service.assertTenantLimit({
        tenantId,
        key: PLAN_LIMIT_KEYS.MAX_USERS,
        currentUsage: 3
      })
    ).resolves.toEqual({ allowed: true, limit: 5, remaining: 1 });
  });

  it('rejects usage above the contracted limit', async () => {
    const service = new PlanLimitService({ findCurrentLimit: vi.fn().mockResolvedValue(2) });
    await expect(
      service.assertTenantLimit({
        tenantId,
        key: PLAN_LIMIT_KEYS.MAX_BRANCHES,
        currentUsage: 2
      })
    ).rejects.toBeInstanceOf(PlanLimitExceededError);
  });

  it('rejects unsupported limit keys', async () => {
    const service = new PlanLimitService({ findCurrentLimit: vi.fn() });
    await expect(service.getTenantLimit(tenantId, 'unknown')).rejects.toThrow();
  });

  it('rejects missing limits and invalid usage values', async () => {
    const service = new PlanLimitService({ findCurrentLimit: vi.fn().mockResolvedValue(null) });
    await expect(
      service.assertTenantLimit({ tenantId, key: PLAN_LIMIT_KEYS.MAX_USERS, currentUsage: 0 })
    ).rejects.toThrow('no current plan limit');
    await expect(
      service.assertTenantLimit({ tenantId, key: PLAN_LIMIT_KEYS.MAX_USERS, currentUsage: -1 })
    ).rejects.toThrow('currentUsage');
    await expect(
      service.assertTenantLimit({
        tenantId,
        key: PLAN_LIMIT_KEYS.MAX_USERS,
        currentUsage: 0,
        requestedAmount: 0
      })
    ).rejects.toThrow('requestedAmount');
  });
});
