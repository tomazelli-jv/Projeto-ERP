import { createUuid } from '@tomazelli/shared';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingRepository } from '../src/modules/onboarding/onboarding.repository.js';

describe('OnboardingRepository', () => {
  it('uses the supplied connection and parameterized SQL for the complete lifecycle', async () => {
    const connection = {
      execute: vi.fn().mockImplementation((sql) => {
        if (sql.includes('FROM plans')) return [[{ id: 'plan-id', isActive: 1, isPublic: 1 }]];
        if (sql.includes('FROM plan_limits')) return [[{ key: 'max_users', value: '5' }]];
        if (sql.includes('FROM users')) return [[{ id: 'user-id', email: 'owner@example.com' }]];
        return [{ affectedRows: 1 }];
      })
    };
    const repository = new OnboardingRepository();
    const tenantId = createUuid();
    const companyId = createUuid();
    const branchId = createUuid();
    const now = new Date();

    await expect(repository.findPlanByCode(connection, 'STARTER')).resolves.toMatchObject({ id: 'plan-id' });
    await expect(repository.findPlanLimits(connection, 'plan-id')).resolves.toHaveLength(1);
    await repository.createTenant(connection, {
      id: tenantId,
      name: 'Tenant',
      slug: 'tenant',
      status: 'active',
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR'
    });
    await repository.createCompany(connection, {
      id: companyId,
      tenantId,
      legalName: 'Company',
      tradeName: null,
      taxIdRoot: '11222333',
      status: 'active'
    });
    await repository.createBranch(connection, {
      id: branchId,
      tenantId,
      companyId,
      code: '001',
      legalName: 'Branch',
      tradeName: 'Matriz',
      taxId: '11222333000181',
      isHeadquarters: true,
      status: 'active',
      email: null,
      phone: null
    });
    await repository.createBranchAddress(connection, {
      id: createUuid(),
      tenantId,
      branchId,
      postalCode: '01001000',
      street: 'Praça da Sé',
      number: '1',
      complement: null,
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      countryCode: 'BR'
    });
    await expect(repository.findUserByEmailForUpdate(connection, 'owner@example.com')).resolves.toMatchObject(
      {
        id: 'user-id'
      }
    );
    await repository.createUserIfMissing(connection, {
      id: createUuid(),
      name: 'Owner',
      email: 'owner@example.com',
      phone: null
    });
    await repository.createMembership(connection, {
      id: createUuid(),
      tenantId,
      userId: 'user-id',
      status: 'active',
      isOwner: true,
      joinedAt: now
    });
    await repository.createSubscription(connection, {
      id: createUuid(),
      tenantId,
      planId: 'plan-id',
      status: 'trialing',
      startsAt: now,
      trialEndsAt: now,
      endsAt: null
    });

    expect(connection.execute).toHaveBeenCalledTimes(10);
    for (const call of connection.execute.mock.calls) {
      expect(call[1]).toBeInstanceOf(Array);
    }
  });

  it('returns null when plan or user is not found', async () => {
    const connection = { execute: vi.fn().mockResolvedValue([[]]) };
    const repository = new OnboardingRepository();
    await expect(repository.findPlanByCode(connection, 'MISSING')).resolves.toBeNull();
    await expect(repository.findUserByEmailForUpdate(connection, 'missing@example.com')).resolves.toBeNull();
  });
});
