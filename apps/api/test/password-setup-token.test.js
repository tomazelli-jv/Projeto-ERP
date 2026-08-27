import { createUuid, PASSWORD_SETUP_PURPOSE } from '@tomazelli/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  equalTokenHashes,
  generatePasswordSetupToken,
  hashPasswordSetupToken
} from '../src/infrastructure/security/password-setup-token.js';
import { PasswordSetupTokenService } from '../src/modules/password-setup/password-setup-token.service.js';

describe('password setup token security', () => {
  it('uses at least 256 CSPRNG bits and deterministic SHA-256 hashes', () => {
    const first = generatePasswordSetupToken();
    const second = generatePasswordSetupToken();
    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(first).not.toBe(second);
    expect(hashPasswordSetupToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(equalTokenHashes(hashPasswordSetupToken(first), hashPasswordSetupToken(first))).toBe(true);
    expect(equalTokenHashes(hashPasswordSetupToken(first), hashPasswordSetupToken(second))).toBe(false);
    expect(() => generatePasswordSetupToken(31)).toThrow('at least 256 bits');
  });

  it('persists only the hash for 24 hours, revokes previous tokens and delivers only after issuance', async () => {
    const userId = createUuid();
    const repository = {
      findUserByIdForUpdate: vi.fn().mockResolvedValue({ id: userId, email: 'user@example.com' }),
      findCredentialByUserId: vi.fn().mockResolvedValue(null),
      revokeActiveTokens: vi.fn().mockResolvedValue(2),
      createToken: vi.fn()
    };
    const notifier = { deliver: vi.fn() };
    const logger = { info: vi.fn() };
    const now = new Date('2026-08-27T12:00:00.000Z');
    const service = new PasswordSetupTokenService({
      repository,
      notifier,
      logger,
      clock: () => now,
      config: { tokenBytes: 32, tokenTtlMs: 24 * 60 * 60 * 1000 }
    });

    const issuance = await service.issueForUser({}, userId);
    const persisted = repository.createToken.mock.calls[0][1];
    expect(persisted).toMatchObject({ userId, purpose: PASSWORD_SETUP_PURPOSE, createdAt: now });
    expect(persisted.expiresAt.toISOString()).toBe('2026-08-28T12:00:00.000Z');
    expect(persisted.tokenHash).toBe(hashPasswordSetupToken(issuance.token));
    expect(JSON.stringify(persisted)).not.toContain(issuance.token);
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(issuance.token);
    await service.deliver(issuance);
    expect(notifier.deliver).toHaveBeenCalledWith({
      recipient: 'user@example.com',
      token: issuance.token,
      expiresAt: issuance.expiresAt
    });
  });

  it('does not issue a token when the global user already has a credential', async () => {
    const repository = {
      findUserByIdForUpdate: vi.fn().mockResolvedValue({ id: 'user', email: 'user@example.com' }),
      findCredentialByUserId: vi.fn().mockResolvedValue({ id: 'credential' }),
      revokeActiveTokens: vi.fn(),
      createToken: vi.fn()
    };
    const service = new PasswordSetupTokenService({
      repository,
      notifier: { deliver: vi.fn() },
      logger: { info: vi.fn() }
    });
    await expect(service.issueForUser({}, 'user')).resolves.toBeNull();
    expect(repository.createToken).not.toHaveBeenCalled();
  });

  it('reuses a user lock already held by the onboarding transaction', async () => {
    const lockedUser = { id: 'locked-user', email: 'locked@example.com' };
    const repository = {
      findUserByIdForUpdate: vi.fn(),
      findCredentialByUserId: vi.fn().mockResolvedValue({ id: 'credential' }),
      revokeActiveTokens: vi.fn(),
      createToken: vi.fn()
    };
    const service = new PasswordSetupTokenService({
      repository,
      notifier: { deliver: vi.fn() },
      logger: { info: vi.fn() }
    });
    await service.issueForUser({}, lockedUser.id, { lockedUser });
    expect(repository.findUserByIdForUpdate).not.toHaveBeenCalled();
  });
});
