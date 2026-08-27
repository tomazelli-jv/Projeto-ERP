import { createUuid, PLAN_LIMIT_KEYS } from '@tomazelli/shared';
import { describe, expect, it, vi } from 'vitest';
import { PlanLimitRepository } from '../src/modules/plans/plan-limit.repository.js';

describe('PlanLimitRepository', () => {
  const tenantId = createUuid();

  it('reads and converts a persisted limit using parameterized SQL', async () => {
    const database = { execute: vi.fn().mockResolvedValue([[{ value: '25' }]]) };
    const repository = new PlanLimitRepository(database);
    await expect(repository.findCurrentLimit(tenantId, PLAN_LIMIT_KEYS.MAX_USERS)).resolves.toBe(25);
    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('subscriptions.tenant_id = ?'), [
      tenantId,
      'max_users'
    ]);
  });

  it('returns null when the current plan has no configured limit', async () => {
    const repository = new PlanLimitRepository({ execute: vi.fn().mockResolvedValue([[]]) });
    await expect(repository.findCurrentLimit(tenantId, PLAN_LIMIT_KEYS.MAX_BRANCHES)).resolves.toBeNull();
  });

  it('rejects invalid stored values', async () => {
    const repository = new PlanLimitRepository({
      execute: vi.fn().mockResolvedValue([[{ value: '99999999999999999999' }]])
    });
    await expect(repository.findCurrentLimit(tenantId, PLAN_LIMIT_KEYS.MAX_COMPANIES)).rejects.toThrow(
      'Invalid stored value'
    );
  });

  it('rejects invalid identifiers and unsupported keys before querying', async () => {
    const database = { execute: vi.fn() };
    const repository = new PlanLimitRepository(database);
    await expect(repository.findCurrentLimit('invalid', PLAN_LIMIT_KEYS.MAX_USERS)).rejects.toThrow();
    await expect(repository.findCurrentLimit(tenantId, 'unknown')).rejects.toThrow();
    expect(database.execute).not.toHaveBeenCalled();
  });
});
