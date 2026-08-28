import { createUuid, PLAN_LIMIT_KEY_VALUES } from '@tomazelli/shared';
import { describe, expect, it, vi } from 'vitest';
import { mapOnboardingDatabaseError } from '../src/modules/onboarding/onboarding.errors.js';
import { OnboardingService } from '../src/modules/onboarding/onboarding.service.js';

const payload = {
  tenant: { name: 'Novo Cliente', slug: 'novo-cliente' },
  company: { legalName: 'Novo Cliente Ltda.', tradeName: 'Novo Cliente', taxId: '11.222.333/0001-81' },
  branch: { code: '001', legalName: 'Novo Cliente Ltda.', tradeName: 'Matriz' },
  owner: { name: 'Owner Original', email: 'owner@example.com', phone: '11999999999' },
  planCode: 'STARTER'
};

function createDependencies(overrides = {}) {
  const connection = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn()
  };
  const repository = {
    findPlanByCode: vi.fn().mockResolvedValue({ id: createUuid(), isActive: 1, isPublic: 1 }),
    findPlanLimits: vi.fn().mockResolvedValue(PLAN_LIMIT_KEY_VALUES.map((key) => ({ key, value: '1' }))),
    createTenant: vi.fn(),
    createCompany: vi.fn(),
    createBranch: vi.fn(),
    createBranchAddress: vi.fn(),
    findUserByEmailForUpdate: vi.fn().mockResolvedValue({
      id: createUuid(),
      name: payload.owner.name,
      email: payload.owner.email,
      phone: payload.owner.phone
    }),
    createUserIfMissing: vi.fn(),
    createMembership: vi.fn(),
    createSubscription: vi.fn(),
    ...overrides.repository
  };
  const database = { getConnection: vi.fn().mockResolvedValue(connection) };
  const logger = { info: vi.fn(), warn: vi.fn() };
  const passwordSetupTokenService = {
    issueForUser: vi.fn().mockResolvedValue({ token: 'raw-token' }),
    deliver: vi.fn(),
    ...overrides.passwordSetupTokenService
  };
  const service = new OnboardingService({
    database,
    repository,
    passwordSetupTokenService,
    logger,
    clock: () => new Date('2026-08-27T12:00:00.000Z'),
    ...overrides.service
  });
  return { service, connection, repository, passwordSetupTokenService };
}

describe('OnboardingService', () => {
  it('creates the complete structure in one transaction and extracts the CNPJ root', async () => {
    const { service, connection, repository, passwordSetupTokenService } = createDependencies();
    const result = await service.onboard(
      {
        ...payload,
        branch: {
          ...payload.branch,
          address: {
            postalCode: '01001000',
            street: 'Praça da Sé',
            number: '1',
            district: 'Sé',
            city: 'São Paulo',
            state: 'SP'
          }
        }
      },
      { requestId: 'request-id' }
    );
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(passwordSetupTokenService.issueForUser).toHaveBeenCalledWith(connection, expect.any(String), {
      lockedUser: expect.objectContaining({ email: 'owner@example.com' })
    });
    expect(passwordSetupTokenService.deliver).toHaveBeenCalledWith({ token: 'raw-token' });
    expect(repository.createCompany).toHaveBeenCalledWith(
      connection,
      expect.objectContaining({ taxIdRoot: '11222333' })
    );
    expect(repository.createBranch).toHaveBeenCalledWith(
      connection,
      expect.objectContaining({ taxId: '11222333000181', isHeadquarters: true })
    );
    expect(repository.createBranchAddress).toHaveBeenCalledWith(
      connection,
      expect.objectContaining({ postalCode: '01001000', countryCode: 'BR' })
    );
    expect(result.subscription).toMatchObject({
      status: 'trialing',
      trialEndsAt: '2026-09-10T12:00:00.000Z'
    });
  });

  it.each([
    [null, 'PLAN_NOT_AVAILABLE'],
    [{ id: createUuid(), isActive: 0, isPublic: 1 }, 'PLAN_NOT_AVAILABLE'],
    [{ id: createUuid(), isActive: 1, isPublic: 0 }, 'PLAN_NOT_AVAILABLE']
  ])('rejects unavailable plans', async (plan, code) => {
    const { service, connection } = createDependencies({
      repository: { findPlanByCode: vi.fn().mockResolvedValue(plan) }
    });
    await expect(service.onboard(payload)).rejects.toMatchObject({ code });
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('rejects plans whose structural limits cannot support onboarding', async () => {
    const { service, connection } = createDependencies({
      repository: {
        findPlanLimits: vi.fn().mockResolvedValue([{ key: 'max_companies', value: '0' }])
      }
    });
    await expect(service.onboard(payload)).rejects.toMatchObject({
      code: 'TENANT_LIMIT_CONFIGURATION_INVALID'
    });
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('reuses an existing global user without overwriting identity data', async () => {
    const existingUser = {
      id: createUuid(),
      name: 'Nome Preservado',
      email: 'owner@example.com',
      phone: '11111111111'
    };
    const { service, repository, passwordSetupTokenService } = createDependencies({
      repository: { findUserByEmailForUpdate: vi.fn().mockResolvedValue(existingUser) }
    });
    const result = await service.onboard(payload);
    expect(repository.createUserIfMissing).toHaveBeenCalledOnce();
    expect(repository.createMembership).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: existingUser.id, isOwner: true })
    );
    expect(result.owner).toMatchObject({ id: existingUser.id, name: 'Nome Preservado' });
    expect(passwordSetupTokenService.issueForUser).toHaveBeenCalledWith(expect.anything(), existingUser.id, {
      lockedUser: existingUser
    });
  });

  it('converges on the locked canonical user after idempotent creation', async () => {
    const concurrentUser = {
      id: createUuid(),
      name: 'Concurrent Owner',
      email: 'owner@example.com',
      phone: null
    };
    const { service, repository } = createDependencies({
      repository: {
        findUserByEmailForUpdate: vi.fn().mockResolvedValue(concurrentUser),
        createUserIfMissing: vi.fn().mockResolvedValue()
      }
    });
    const result = await service.onboard(payload);
    expect(result.owner.id).toBe(concurrentUser.id);
    expect(repository.createMembership).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: concurrentUser.id })
    );
  });

  it('retries the complete transaction after a transient MariaDB deadlock', async () => {
    const deadlock = Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' });
    const { service, connection, repository } = createDependencies({
      repository: {
        createUserIfMissing: vi.fn().mockRejectedValueOnce(deadlock).mockResolvedValueOnce()
      }
    });
    await expect(service.onboard(payload)).resolves.toMatchObject({ owner: { email: 'owner@example.com' } });
    expect(connection.beginTransaction).toHaveBeenCalledTimes(2);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledTimes(2);
    expect(repository.createTenant).toHaveBeenCalledTimes(2);
  });

  it('rolls back and maps known database uniqueness errors', async () => {
    const duplicate = Object.assign(new Error('duplicate'), {
      code: 'ER_DUP_ENTRY',
      sqlMessage: "Duplicate entry for key 'uq_tenants_slug'"
    });
    const { service, connection } = createDependencies({
      repository: { createTenant: vi.fn().mockRejectedValue(duplicate) }
    });
    await expect(service.onboard(payload)).rejects.toMatchObject({
      code: 'TENANT_SLUG_ALREADY_EXISTS',
      statusCode: 409
    });
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('rolls back the complete onboarding when password setup token issuance fails', async () => {
    const { service, connection } = createDependencies({
      passwordSetupTokenService: { issueForUser: vi.fn().mockRejectedValue(new Error('issuance failed')) }
    });
    await expect(service.onboard(payload)).rejects.toThrow('issuance failed');
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('maps CNPJ and membership constraints without exposing database details', () => {
    expect(
      mapOnboardingDatabaseError({ code: 'ER_DUP_ENTRY', sqlMessage: "key 'uq_branches_tax_id'" })
    ).toMatchObject({ code: 'CNPJ_ALREADY_REGISTERED', statusCode: 409 });
    expect(
      mapOnboardingDatabaseError({ code: 'ER_DUP_ENTRY', sqlMessage: "key 'uq_memberships_tenant_user'" })
    ).toMatchObject({ code: 'MEMBERSHIP_ALREADY_EXISTS', statusCode: 409 });
    expect(mapOnboardingDatabaseError({ code: 'ER_DUP_ENTRY', sqlMessage: 'other unique' })).toMatchObject({
      code: 'ONBOARDING_CONFLICT',
      statusCode: 409
    });
    const original = new Error('not a duplicate');
    expect(mapOnboardingDatabaseError(original)).toBe(original);
  });
});
