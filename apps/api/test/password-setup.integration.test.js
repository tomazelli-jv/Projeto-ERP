import { createUuid, PASSWORD_SETUP_PURPOSE } from '@tomazelli/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDatabasePool } from '../src/infrastructure/database.js';
import { PasswordHasher } from '../src/infrastructure/security/password-hasher.js';
import { hashPasswordSetupToken } from '../src/infrastructure/security/password-setup-token.js';
import { PasswordSetupRepository } from '../src/modules/password-setup/password-setup.repository.js';
import { PasswordSetupService } from '../src/modules/password-setup/password-setup.service.js';

const integrationEnabled = process.env.DB_INTEGRATION_TESTS === 'true';

describe.runIf(integrationEnabled)('initial password setup with MariaDB', () => {
  const integrationDatabase = createDatabasePool();
  const repository = new PasswordSetupRepository();
  const logger = { info: () => {}, warn: () => {} };
  const service = new PasswordSetupService({
    database: integrationDatabase,
    repository,
    passwordHasher: new PasswordHasher(),
    logger
  });
  const app = createApp({ passwordSetupService: service, passwordSetupRateLimit: 100 });
  const testEmailPattern = '%@password-setup.test';

  async function createUserAndToken({
    expiresAt,
    usedAt = null,
    revokedAt = null,
    purpose = PASSWORD_SETUP_PURPOSE
  } = {}) {
    const userId = createUuid();
    const tokenId = createUuid();
    const token = `token-${createUuid()}`;
    await integrationDatabase.execute('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      userId,
      'Password Setup User',
      `${userId}@password-setup.test`
    ]);
    await integrationDatabase.execute(
      `INSERT INTO password_setup_tokens
        (id, user_id, token_hash, purpose, expires_at, used_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tokenId,
        userId,
        hashPasswordSetupToken(token),
        purpose,
        expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
        usedAt,
        revokedAt
      ]
    );
    return { userId, tokenId, token };
  }

  beforeEach(async () => {
    await integrationDatabase.execute(
      `DELETE pst FROM password_setup_tokens pst
        JOIN users u ON u.id = pst.user_id
       WHERE u.email LIKE ?`,
      [testEmailPattern]
    );
    await integrationDatabase.execute(
      `DELETE uc FROM user_credentials uc
        JOIN users u ON u.id = uc.user_id
       WHERE u.email LIKE ?`,
      [testEmailPattern]
    );
    await integrationDatabase.execute('DELETE FROM users WHERE email LIKE ?', [testEmailPattern]);
  });

  afterAll(async () => {
    await integrationDatabase.end();
  });

  it('creates one credential and atomically consumes the token', async () => {
    const fixture = await createUserAndToken();
    const response = await request(app)
      .post('/api/v1/auth/password/setup/confirm')
      .send({ token: fixture.token, password: 'uma frase senha segura' });
    expect(response.status).toBe(200);
    const [credentials] = await integrationDatabase.execute(
      'SELECT password_hash AS passwordHash FROM user_credentials WHERE user_id = ?',
      [fixture.userId]
    );
    const [tokens] = await integrationDatabase.execute(
      'SELECT used_at AS usedAt FROM password_setup_tokens WHERE id = ?',
      [fixture.tokenId]
    );
    expect(credentials).toHaveLength(1);
    expect(credentials[0].passwordHash).toMatch(/^\$argon2id\$/);
    expect(tokens[0].usedAt).toBeInstanceOf(Date);
  });

  it('allows only one success under concurrent confirmation of the same token', async () => {
    const fixture = await createUserAndToken();
    const payload = { token: fixture.token, password: 'uma frase senha concorrente' };
    const responses = await Promise.all([
      request(app).post('/api/v1/auth/password/setup/confirm').send(payload),
      request(app).post('/api/v1/auth/password/setup/confirm').send(payload)
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 422]);
    const [credentials] = await integrationDatabase.execute(
      'SELECT id FROM user_credentials WHERE user_id = ?',
      [fixture.userId]
    );
    const [tokens] = await integrationDatabase.execute(
      'SELECT used_at AS usedAt FROM password_setup_tokens WHERE id = ?',
      [fixture.tokenId]
    );
    expect(credentials).toHaveLength(1);
    expect(tokens[0].usedAt).toBeInstanceOf(Date);
  });

  it('rolls back the credential if token consumption cannot complete', async () => {
    const fixture = await createUserAndToken();
    const failingRepository = Object.create(repository);
    failingRepository.markTokenUsed = async () => 0;
    const failingService = new PasswordSetupService({
      database: integrationDatabase,
      repository: failingRepository,
      passwordHasher: new PasswordHasher(),
      logger
    });
    await expect(
      failingService.confirm({ token: fixture.token, password: 'uma frase senha rollback' })
    ).rejects.toMatchObject({ code: 'PASSWORD_SETUP_TOKEN_CONSUMPTION_FAILED' });
    const [credentials] = await integrationDatabase.execute(
      'SELECT id FROM user_credentials WHERE user_id = ?',
      [fixture.userId]
    );
    const [tokens] = await integrationDatabase.execute(
      'SELECT used_at AS usedAt FROM password_setup_tokens WHERE id = ?',
      [fixture.tokenId]
    );
    expect(credentials).toHaveLength(0);
    expect(tokens[0].usedAt).toBeNull();
  });

  it('rejects a user that already has a credential without changing either record', async () => {
    const fixture = await createUserAndToken();
    const existingHash = await new PasswordHasher().hash('senha existente segura');
    await integrationDatabase.execute(
      'INSERT INTO user_credentials (id, user_id, password_hash) VALUES (?, ?, ?)',
      [createUuid(), fixture.userId, existingHash]
    );
    const response = await request(app)
      .post('/api/v1/auth/password/setup/confirm')
      .send({ token: fixture.token, password: 'uma nova senha proibida' });
    expect(response.status).toBe(409);
    const [credentials] = await integrationDatabase.execute(
      'SELECT password_hash AS passwordHash FROM user_credentials WHERE user_id = ?',
      [fixture.userId]
    );
    expect(credentials).toEqual([{ passwordHash: existingHash }]);
  });

  it('enforces credential and token uniqueness constraints', async () => {
    const fixture = await createUserAndToken();
    await integrationDatabase.execute(
      'INSERT INTO user_credentials (id, user_id, password_hash) VALUES (?, ?, ?)',
      [createUuid(), fixture.userId, '$argon2id$first']
    );
    await expect(
      integrationDatabase.execute(
        'INSERT INTO user_credentials (id, user_id, password_hash) VALUES (?, ?, ?)',
        [createUuid(), fixture.userId, '$argon2id$second']
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(
      integrationDatabase.execute(
        'INSERT INTO password_setup_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
        [
          createUuid(),
          fixture.userId,
          hashPasswordSetupToken(fixture.token),
          PASSWORD_SETUP_PURPOSE,
          new Date(Date.now() + 1000)
        ]
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });
});
