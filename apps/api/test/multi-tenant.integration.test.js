import { createUuid, PLAN_LIMIT_KEYS } from '@tomazelli/shared';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabasePool } from '../src/infrastructure/database.js';
import { PlanLimitRepository } from '../src/modules/plans/plan-limit.repository.js';

const integrationEnabled = process.env.DB_INTEGRATION_TESTS === 'true';

describe.runIf(integrationEnabled)('multi-tenant database constraints', () => {
  const integrationDatabase = createDatabasePool();
  let connection;

  beforeEach(async () => {
    connection = await integrationDatabase.getConnection();
    await connection.beginTransaction();
  });

  afterEach(async () => {
    await connection.rollback();
    connection.release();
  });

  afterAll(async () => {
    await integrationDatabase.end();
  });

  it('allows Tenant → Company → Branch only inside the same tenant', async () => {
    const tenantA = createUuid();
    const tenantB = createUuid();
    const companyB = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?), (?, ?, ?)', [
      tenantA,
      'Tenant A',
      `tenant-a-${tenantA}`,
      tenantB,
      'Tenant B',
      `tenant-b-${tenantB}`
    ]);
    await connection.execute('INSERT INTO companies (id, tenant_id, legal_name) VALUES (?, ?, ?)', [
      companyB,
      tenantB,
      'Company B Ltda.'
    ]);

    await expect(
      connection.execute(
        'INSERT INTO branches (id, tenant_id, company_id, code, legal_name) VALUES (?, ?, ?, ?, ?)',
        [createUuid(), tenantA, companyB, 'INVALID', 'Invalid cross-tenant branch']
      )
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });

    await expect(
      connection.execute(
        'INSERT INTO branches (id, tenant_id, company_id, code, legal_name, is_headquarters) VALUES (?, ?, ?, ?, ?, ?)',
        [createUuid(), tenantB, companyB, 'HQ', 'Company B Headquarters', true]
      )
    ).resolves.toBeDefined();
  });

  it('rejects a branch address that uses another tenant context', async () => {
    const tenantA = createUuid();
    const tenantB = createUuid();
    const companyA = createUuid();
    const branchA = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?), (?, ?, ?)', [
      tenantA,
      'Address Tenant A',
      `address-a-${tenantA}`,
      tenantB,
      'Address Tenant B',
      `address-b-${tenantB}`
    ]);
    await connection.execute('INSERT INTO companies (id, tenant_id, legal_name) VALUES (?, ?, ?)', [
      companyA,
      tenantA,
      'Address Company A'
    ]);
    await connection.execute(
      'INSERT INTO branches (id, tenant_id, company_id, code, legal_name) VALUES (?, ?, ?, ?, ?)',
      [branchA, tenantA, companyA, 'BRANCH-A', 'Branch A']
    );

    await expect(
      connection.execute(
        'INSERT INTO branch_addresses (id, tenant_id, branch_id, street, number, district, city, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [createUuid(), tenantB, branchA, 'Rua Inválida', '1', 'Centro', 'São Paulo', 'SP']
      )
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });

  it('enforces one membership per tenant and user', async () => {
    const tenantId = createUuid();
    const userId = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [
      tenantId,
      'Membership Tenant',
      `membership-${tenantId}`
    ]);
    await connection.execute('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      userId,
      'Global User',
      `${userId}@example.com`
    ]);
    await connection.execute(
      'INSERT INTO tenant_memberships (id, tenant_id, user_id, status) VALUES (?, ?, ?, ?)',
      [createUuid(), tenantId, userId, 'active']
    );

    await expect(
      connection.execute(
        'INSERT INTO tenant_memberships (id, tenant_id, user_id, status) VALUES (?, ?, ?, ?)',
        [createUuid(), tenantId, userId, 'pending']
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('enforces one active owner per tenant', async () => {
    const tenantId = createUuid();
    const firstUser = createUuid();
    const secondUser = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [
      tenantId,
      'Owner Tenant',
      `owner-${tenantId}`
    ]);
    await connection.execute('INSERT INTO users (id, name, email) VALUES (?, ?, ?), (?, ?, ?)', [
      firstUser,
      'First Owner',
      `${firstUser}@example.com`,
      secondUser,
      'Second Owner',
      `${secondUser}@example.com`
    ]);
    await connection.execute(
      'INSERT INTO tenant_memberships (id, tenant_id, user_id, status, is_owner) VALUES (?, ?, ?, ?, ?)',
      [createUuid(), tenantId, firstUser, 'active', true]
    );

    await expect(
      connection.execute(
        'INSERT INTO tenant_memberships (id, tenant_id, user_id, status, is_owner) VALUES (?, ?, ?, ?, ?)',
        [createUuid(), tenantId, secondUser, 'active', true]
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('enforces one headquarters branch per company', async () => {
    const tenantId = createUuid();
    const companyId = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [
      tenantId,
      'Headquarters Tenant',
      `headquarters-${tenantId}`
    ]);
    await connection.execute('INSERT INTO companies (id, tenant_id, legal_name) VALUES (?, ?, ?)', [
      companyId,
      tenantId,
      'Headquarters Company'
    ]);
    await connection.execute(
      'INSERT INTO branches (id, tenant_id, company_id, code, legal_name, is_headquarters) VALUES (?, ?, ?, ?, ?, ?)',
      [createUuid(), tenantId, companyId, 'HQ-1', 'First Headquarters', true]
    );

    await expect(
      connection.execute(
        'INSERT INTO branches (id, tenant_id, company_id, code, legal_name, is_headquarters) VALUES (?, ?, ?, ?, ?, ?)',
        [createUuid(), tenantId, companyId, 'HQ-2', 'Second Headquarters', true]
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('preserves subscription history but permits only one current subscription', async () => {
    const tenantId = createUuid();
    const firstPlan = createUuid();
    const secondPlan = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [
      tenantId,
      'Subscription Tenant',
      `subscription-${tenantId}`
    ]);
    await connection.execute('INSERT INTO plans (id, code, name) VALUES (?, ?, ?), (?, ?, ?)', [
      firstPlan,
      `FIRST-${firstPlan}`,
      'First Plan',
      secondPlan,
      `SECOND-${secondPlan}`,
      'Second Plan'
    ]);
    await connection.execute(
      'INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, ends_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))',
      [createUuid(), tenantId, firstPlan, 'expired']
    );
    await expect(
      connection.execute(
        'INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, ends_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))',
        [createUuid(), tenantId, secondPlan, 'cancelled']
      )
    ).resolves.toBeDefined();
    await connection.execute(
      'INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))',
      [createUuid(), tenantId, secondPlan, 'active']
    );

    await expect(
      connection.execute(
        'INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))',
        [createUuid(), tenantId, firstPlan, 'trialing']
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('reads limits from the tenant current subscription', async () => {
    const tenantId = createUuid();
    const planId = createUuid();
    await connection.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [
      tenantId,
      'Limited Tenant',
      `limited-${tenantId}`
    ]);
    await connection.execute('INSERT INTO plans (id, code, name) VALUES (?, ?, ?)', [
      planId,
      `PLAN-${planId}`,
      'Integration Plan'
    ]);
    await connection.execute('INSERT INTO plan_limits (id, plan_id, `key`, value) VALUES (?, ?, ?, ?)', [
      createUuid(),
      planId,
      PLAN_LIMIT_KEYS.MAX_COMPANIES,
      4
    ]);
    await connection.execute(
      'INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))',
      [createUuid(), tenantId, planId, 'active']
    );

    const repository = new PlanLimitRepository(connection);
    await expect(repository.findCurrentLimit(tenantId, PLAN_LIMIT_KEYS.MAX_COMPANIES)).resolves.toBe(4);
  });
});
