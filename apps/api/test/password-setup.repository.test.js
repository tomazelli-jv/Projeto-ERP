import { describe, expect, it, vi } from 'vitest';
import { PasswordSetupRepository } from '../src/modules/password-setup/password-setup.repository.js';

describe('PasswordSetupRepository', () => {
  it('uses only the supplied connection and parameterized SQL', async () => {
    const connection = {
      execute: vi.fn().mockImplementation((sql) => {
        if (sql.includes('FROM password_setup_tokens')) return [[{ id: 'token-id' }]];
        if (sql.includes('FROM user_credentials')) return [[{ id: 'credential-id' }]];
        if (sql.includes('FROM users')) return [[{ id: 'user-id', email: 'user@example.com' }]];
        return [{ affectedRows: 1 }];
      })
    };
    const repository = new PasswordSetupRepository();
    const timestamp = new Date();
    await repository.findUserByIdForUpdate(connection, 'user-id');
    await repository.findCredentialByUserId(connection, 'user-id');
    await repository.revokeActiveTokens(connection, {
      userId: 'user-id',
      purpose: 'initial_password',
      revokedAt: timestamp
    });
    await repository.createToken(connection, {
      id: 'token-id',
      userId: 'user-id',
      tokenHash: 'a'.repeat(64),
      purpose: 'initial_password',
      expiresAt: new Date(timestamp.getTime() + 1000),
      createdAt: timestamp
    });
    await repository.findTokenByHashForUpdate(connection, 'a'.repeat(64));
    await repository.createCredential(connection, {
      id: 'credential-id',
      userId: 'user-id',
      passwordHash: '$argon2id$hash',
      createdAt: timestamp
    });
    await repository.markTokenUsed(connection, { tokenId: 'token-id', usedAt: timestamp });

    for (const call of connection.execute.mock.calls) expect(call[1]).toBeInstanceOf(Array);
    expect(connection.execute.mock.calls.some(([sql]) => sql.includes('FOR UPDATE'))).toBe(true);
  });
});
