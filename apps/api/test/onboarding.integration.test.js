import { createUuid, PLAN_LIMIT_KEY_VALUES } from '@tomazelli/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDatabasePool } from '../src/infrastructure/database.js';
import { logger } from '../src/infrastructure/logger.js';
import { OnboardingRepository } from '../src/modules/onboarding/onboarding.repository.js';
import { OnboardingService } from '../src/modules/onboarding/onboarding.service.js';

const integrationEnabled = process.env.DB_INTEGRATION_TESTS === 'true';

describe.runIf(integrationEnabled)('POST /api/v1/onboarding with MariaDB', () => {
  const integrationDatabase = createDatabasePool();
  const planId = createUuid();
  const planCode = `ONBOARD-${planId}`.slice(0, 50).toUpperCase();
  const slugPrefix = `onboarding-${planId.slice(0, 8)}`;
  const onboardingService = new OnboardingService({
    database: integrationDatabase,
    repository: new OnboardingRepository(),
    logger
  });
  const app = createApp({ onboardingService });

  function payload({ slug, taxId, ownerEmail, address = false }) {
    return {
      tenant: { name: `Tenant ${slug}`, slug },
      company: { legalName: `Company ${slug} Ltda.`, tradeName: `Company ${slug}`, taxId },
      branch: {
        code: '001',
        legalName: `Company ${slug} Ltda.`,
        tradeName: 'Matriz',
        email: `branch-${slug}@onboarding.test`,
        phone: '(11) 99999-0000',
        ...(address
          ? {
              address: {
                postalCode: '01001-000',
                street: 'Praça da Sé',
                number: '1',
                district: 'Sé',
                city: 'São Paulo',
                state: 'SP'
              }
            }
          : {})
      },
      owner: { name: `Owner ${slug}`, email: ownerEmail, phone: '(11) 98888-0000' },
      planCode
    };
  }

  beforeAll(async () => {
    await integrationDatabase.execute(
      'INSERT INTO plans (id, code, name, is_active, is_public) VALUES (?, ?, ?, ?, ?)',
      [planId, planCode, 'Onboarding Integration Plan', true, true]
    );
    for (const key of PLAN_LIMIT_KEY_VALUES) {
      await integrationDatabase.execute(
        'INSERT INTO plan_limits (id, plan_id, `key`, `value`) VALUES (?, ?, ?, ?)',
        [createUuid(), planId, key, 5]
      );
    }
  });

  afterAll(async () => {
    const [tenantRows] = await integrationDatabase.execute('SELECT id FROM tenants WHERE slug LIKE ?', [
      `${slugPrefix}%`
    ]);
    const tenantIds = tenantRows.map(({ id }) => id);
    if (tenantIds.length) {
      const placeholders = tenantIds.map(() => '?').join(',');
      await integrationDatabase.execute(
        `DELETE FROM subscriptions WHERE tenant_id IN (${placeholders})`,
        tenantIds
      );
      await integrationDatabase.execute(
        `DELETE FROM branch_addresses WHERE tenant_id IN (${placeholders})`,
        tenantIds
      );
      await integrationDatabase.execute(
        `DELETE FROM branches WHERE tenant_id IN (${placeholders})`,
        tenantIds
      );
      await integrationDatabase.execute(
        `DELETE FROM companies WHERE tenant_id IN (${placeholders})`,
        tenantIds
      );
      await integrationDatabase.execute(
        `DELETE FROM tenant_memberships WHERE tenant_id IN (${placeholders})`,
        tenantIds
      );
      await integrationDatabase.execute(`DELETE FROM tenants WHERE id IN (${placeholders})`, tenantIds);
    }
    await integrationDatabase.execute("DELETE FROM users WHERE email LIKE '%@onboarding.test'");
    await integrationDatabase.execute('DELETE FROM plan_limits WHERE plan_id = ?', [planId]);
    await integrationDatabase.execute('DELETE FROM plans WHERE id = ?', [planId]);
    await integrationDatabase.end();
  });

  it('atomically creates the complete onboarding structure', async () => {
    const slug = `${slugPrefix}-complete`;
    const response = await request(app)
      .post('/api/v1/onboarding')
      .send(
        payload({ slug, taxId: '11222333000181', ownerEmail: 'complete@onboarding.test', address: true })
      );

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      tenant: { name: `Tenant ${slug}`, slug },
      company: { legalName: `Company ${slug} Ltda.` },
      branch: { code: '001', tradeName: 'Matriz' },
      owner: { email: 'complete@onboarding.test' },
      subscription: { status: 'trialing' }
    });

    const [rows] = await integrationDatabase.execute(
      `SELECT t.id AS tenantId, c.tax_id_root AS taxIdRoot, b.tax_id AS taxId,
              b.is_headquarters AS isHeadquarters, a.country_code AS countryCode,
              tm.is_owner AS isOwner, s.status AS subscriptionStatus
         FROM tenants t
         JOIN companies c ON c.tenant_id = t.id
         JOIN branches b ON b.tenant_id = t.id AND b.company_id = c.id
         JOIN branch_addresses a ON a.tenant_id = t.id AND a.branch_id = b.id
         JOIN tenant_memberships tm ON tm.tenant_id = t.id
         JOIN subscriptions s ON s.tenant_id = t.id
        WHERE t.slug = ?`,
      [slug]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      taxIdRoot: '11222333',
      taxId: '11222333000181',
      isHeadquarters: 1,
      countryCode: 'BR',
      isOwner: 1,
      subscriptionStatus: 'trialing'
    });
  });

  it('rolls back every partial record when the CNPJ already exists', async () => {
    const originalSlug = `${slugPrefix}-cnpj-original`;
    const duplicateSlug = `${slugPrefix}-cnpj-rollback`;
    await request(app)
      .post('/api/v1/onboarding')
      .send(payload({ slug: originalSlug, taxId: '04252011000110', ownerEmail: 'original@onboarding.test' }))
      .expect(201);

    const response = await request(app)
      .post('/api/v1/onboarding')
      .send(
        payload({ slug: duplicateSlug, taxId: '04252011000110', ownerEmail: 'rollback@onboarding.test' })
      );
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CNPJ_ALREADY_REGISTERED');

    const [rollbackState] = await integrationDatabase.execute(
      `SELECT
        (SELECT COUNT(*) FROM tenants WHERE slug = ?) AS tenantsCount,
        (SELECT COUNT(*) FROM companies WHERE legal_name = ?) AS companiesCount,
        (SELECT COUNT(*) FROM branches WHERE legal_name = ?) AS branchesCount,
        (SELECT COUNT(*) FROM users WHERE email = ?) AS usersCount,
        (SELECT COUNT(*) FROM tenant_memberships tm JOIN tenants t ON t.id = tm.tenant_id WHERE t.slug = ?) AS membershipsCount,
        (SELECT COUNT(*) FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id WHERE t.slug = ?) AS subscriptionsCount`,
      [
        duplicateSlug,
        `Company ${duplicateSlug} Ltda.`,
        `Company ${duplicateSlug} Ltda.`,
        'rollback@onboarding.test',
        duplicateSlug,
        duplicateSlug
      ]
    );
    expect(rollbackState[0]).toEqual({
      tenantsCount: 0,
      companiesCount: 0,
      branchesCount: 0,
      usersCount: 0,
      membershipsCount: 0,
      subscriptionsCount: 0
    });
  });

  it('reuses an existing global user and preserves its data', async () => {
    const userId = createUuid();
    const email = 'existing@onboarding.test';
    await integrationDatabase.execute('INSERT INTO users (id, name, email, phone) VALUES (?, ?, ?, ?)', [
      userId,
      'Existing Name',
      email,
      '11111111111'
    ]);
    const slug = `${slugPrefix}-existing-user`;
    const response = await request(app)
      .post('/api/v1/onboarding')
      .send(payload({ slug, taxId: '33000167000101', ownerEmail: email }));

    expect(response.status).toBe(201);
    expect(response.body.data.owner).toMatchObject({ id: userId, name: 'Existing Name', email });
    const [users] = await integrationDatabase.execute('SELECT id, name, phone FROM users WHERE email = ?', [
      email
    ]);
    const [memberships] = await integrationDatabase.execute(
      'SELECT user_id AS userId, is_owner AS isOwner FROM tenant_memberships WHERE user_id = ?',
      [userId]
    );
    expect(users).toEqual([{ id: userId, name: 'Existing Name', phone: '11111111111' }]);
    expect(memberships).toEqual([{ userId, isOwner: 1 }]);
  });

  it('converges concurrent onboardings with the same email to one global user', async () => {
    const email = 'concurrent@onboarding.test';
    const firstSlug = `${slugPrefix}-concurrent-a`;
    const secondSlug = `${slugPrefix}-concurrent-b`;
    const responses = await Promise.all([
      request(app)
        .post('/api/v1/onboarding')
        .send(payload({ slug: firstSlug, taxId: '45723174000110', ownerEmail: email })),
      request(app)
        .post('/api/v1/onboarding')
        .send(payload({ slug: secondSlug, taxId: '04712500000107', ownerEmail: email }))
    ]);
    expect(responses.map(({ status }) => status)).toEqual([201, 201]);

    const [users] = await integrationDatabase.execute('SELECT id FROM users WHERE email = ?', [email]);
    expect(users).toHaveLength(1);
    const [memberships] = await integrationDatabase.execute(
      'SELECT tenant_id FROM tenant_memberships WHERE user_id = ?',
      [users[0].id]
    );
    expect(memberships).toHaveLength(2);
  });

  it('treats a repeated submission as a slug conflict without partial duplicates', async () => {
    const slug = `${slugPrefix}-repeated`;
    const repeatedPayload = payload({
      slug,
      taxId: '60701190000104',
      ownerEmail: 'repeated@onboarding.test'
    });
    await request(app).post('/api/v1/onboarding').send(repeatedPayload).expect(201);
    const response = await request(app).post('/api/v1/onboarding').send(repeatedPayload);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TENANT_SLUG_ALREADY_EXISTS');

    const [tenants] = await integrationDatabase.execute('SELECT id FROM tenants WHERE slug = ?', [slug]);
    expect(tenants).toHaveLength(1);
  });
});
