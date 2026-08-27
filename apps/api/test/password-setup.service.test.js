import { PASSWORD_SETUP_PURPOSE } from '@tomazelli/shared';
import { describe, expect, it, vi } from 'vitest';
import { PasswordSetupService } from '../src/modules/password-setup/password-setup.service.js';

const validInput = { token: 'raw-secret-token', password: 'uma frase senha segura' };
const now = new Date('2026-08-27T12:00:00.000Z');

function createDependencies(repositoryOverrides = {}) {
  const connection = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn()
  };
  const repository = {
    findTokenByHashForUpdate: vi.fn().mockResolvedValue({
      id: 'token-id',
      userId: 'user-id',
      purpose: PASSWORD_SETUP_PURPOSE,
      expiresAt: new Date('2026-08-28T12:00:00.000Z'),
      usedAt: null,
      revokedAt: null
    }),
    findUserByIdForUpdate: vi.fn().mockResolvedValue({ id: 'user-id' }),
    findCredentialByUserId: vi.fn().mockResolvedValue(null),
    createCredential: vi.fn(),
    markTokenUsed: vi.fn().mockResolvedValue(1),
    revokeActiveTokens: vi.fn().mockResolvedValue(0),
    ...repositoryOverrides
  };
  const passwordHasher = { hash: vi.fn().mockResolvedValue('$argon2id$not-a-real-test-hash') };
  const logger = { info: vi.fn(), warn: vi.fn() };
  const service = new PasswordSetupService({
    database: { getConnection: vi.fn().mockResolvedValue(connection) },
    repository,
    passwordHasher,
    logger,
    clock: () => now
  });
  return { service, connection, repository, passwordHasher, logger };
}

describe('PasswordSetupService', () => {
  it('creates the credential, consumes the token and invalidates siblings atomically', async () => {
    const { service, connection, repository, passwordHasher, logger } = createDependencies();
    await expect(service.confirm(validInput, { requestId: 'request-id' })).resolves.toEqual({
      passwordDefined: true
    });
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(passwordHasher.hash).toHaveBeenCalledWith(validInput.password);
    expect(repository.createCredential).toHaveBeenCalledWith(
      connection,
      expect.objectContaining({ userId: 'user-id', passwordHash: '$argon2id$not-a-real-test-hash' })
    );
    expect(repository.markTokenUsed).toHaveBeenCalledWith(connection, { tokenId: 'token-id', usedAt: now });
    expect(repository.revokeActiveTokens).toHaveBeenCalledWith(connection, {
      userId: 'user-id',
      purpose: PASSWORD_SETUP_PURPOSE,
      revokedAt: now
    });
    const logs = JSON.stringify([...logger.info.mock.calls, ...logger.warn.mock.calls]);
    expect(logs).not.toContain(validInput.token);
    expect(logs).not.toContain(validInput.password);
    expect(logs).not.toContain('$argon2id$');
  });

  it.each([
    [null, 'PASSWORD_SETUP_TOKEN_INVALID'],
    [
      { purpose: 'other', expiresAt: new Date('2026-08-28'), usedAt: null, revokedAt: null },
      'PASSWORD_SETUP_TOKEN_PURPOSE_INVALID'
    ],
    [
      { purpose: PASSWORD_SETUP_PURPOSE, expiresAt: new Date('2026-08-28'), usedAt: now, revokedAt: null },
      'PASSWORD_SETUP_TOKEN_ALREADY_USED'
    ],
    [
      { purpose: PASSWORD_SETUP_PURPOSE, expiresAt: new Date('2026-08-28'), usedAt: null, revokedAt: now },
      'PASSWORD_SETUP_TOKEN_REVOKED'
    ],
    [
      {
        purpose: PASSWORD_SETUP_PURPOSE,
        expiresAt: new Date('2026-08-27T11:59:59Z'),
        usedAt: null,
        revokedAt: null
      },
      'PASSWORD_SETUP_TOKEN_EXPIRED'
    ]
  ])('rejects an unusable token with an internal code', async (token, code) => {
    const normalizedToken = token ? { id: 'token-id', userId: 'user-id', ...token } : null;
    const { service, connection } = createDependencies({
      findTokenByHashForUpdate: vi.fn().mockResolvedValue(normalizedToken)
    });
    await expect(service.confirm(validInput)).rejects.toMatchObject({ code });
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('refuses to replace an existing password', async () => {
    const { service, connection, repository } = createDependencies({
      findCredentialByUserId: vi.fn().mockResolvedValue({ id: 'credential-id' })
    });
    await expect(service.confirm(validInput)).rejects.toMatchObject({ code: 'PASSWORD_ALREADY_DEFINED' });
    expect(repository.createCredential).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it.each([
    ['credential creation', { createCredential: vi.fn().mockRejectedValue(new Error('write failed')) }],
    ['token consumption', { markTokenUsed: vi.fn().mockResolvedValue(0) }]
  ])('rolls back when %s fails', async (_case, override) => {
    const { service, connection } = createDependencies(override);
    await expect(service.confirm(validInput)).rejects.toBeDefined();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('maps password validation to a domain-safe policy error without opening a transaction', async () => {
    const { service, connection } = createDependencies();
    await expect(service.confirm({ token: 'token', password: 'short' })).rejects.toMatchObject({
      code: 'PASSWORD_POLICY_VIOLATION'
    });
    expect(connection.beginTransaction).not.toHaveBeenCalled();
  });
});
