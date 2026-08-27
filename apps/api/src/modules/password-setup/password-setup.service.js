import { createUuid, passwordSetupConfirmInputSchema, PASSWORD_SETUP_PURPOSE } from '@tomazelli/shared';
import { hashPasswordSetupToken } from '../../infrastructure/security/password-setup-token.js';
import { passwordSetupError } from './password-setup.errors.js';

export class PasswordSetupService {
  constructor({ database, repository, passwordHasher, logger, clock = () => new Date() }) {
    this.database = database;
    this.repository = repository;
    this.passwordHasher = passwordHasher;
    this.logger = logger;
    this.clock = clock;
  }

  async confirm(rawInput, context = {}) {
    const parsed = passwordSetupConfirmInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      if (parsed.error.issues.some(({ path }) => path[0] === 'password')) {
        throw passwordSetupError('PASSWORD_POLICY_VIOLATION');
      }
      throw parsed.error;
    }

    const tokenHash = hashPasswordSetupToken(parsed.data.token);
    const connection = await this.database.getConnection();
    const logContext = { requestId: context.requestId, event: 'initial_password_setup' };

    try {
      await connection.beginTransaction();
      const token = await this.repository.findTokenByHashForUpdate(connection, tokenHash);
      this.#assertUsableToken(token);

      await this.repository.findUserByIdForUpdate(connection, token.userId);
      const credential = await this.repository.findCredentialByUserId(connection, token.userId);
      if (credential) throw passwordSetupError('PASSWORD_ALREADY_DEFINED');

      const now = this.clock();
      const passwordHash = await this.passwordHasher.hash(parsed.data.password);
      await this.repository.createCredential(connection, {
        id: createUuid(),
        userId: token.userId,
        passwordHash,
        createdAt: now
      });
      const consumed = await this.repository.markTokenUsed(connection, { tokenId: token.id, usedAt: now });
      if (consumed !== 1) throw passwordSetupError('PASSWORD_SETUP_TOKEN_CONSUMPTION_FAILED');
      await this.repository.revokeActiveTokens(connection, {
        userId: token.userId,
        purpose: PASSWORD_SETUP_PURPOSE,
        revokedAt: now
      });

      await connection.commit();
      this.logger.info({ ...logContext, userId: token.userId }, 'Initial password defined');
      return { passwordDefined: true };
    } catch (error) {
      await connection.rollback();
      this.logger.warn(
        { ...logContext, code: error.code ?? 'PASSWORD_SETUP_FAILED' },
        'Password setup failed'
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  #assertUsableToken(token) {
    if (!token) throw passwordSetupError('PASSWORD_SETUP_TOKEN_INVALID');
    if (token.purpose !== PASSWORD_SETUP_PURPOSE)
      throw passwordSetupError('PASSWORD_SETUP_TOKEN_PURPOSE_INVALID');
    if (token.usedAt) throw passwordSetupError('PASSWORD_SETUP_TOKEN_ALREADY_USED');
    if (token.revokedAt) throw passwordSetupError('PASSWORD_SETUP_TOKEN_REVOKED');
    if (new Date(token.expiresAt).getTime() <= this.clock().getTime())
      throw passwordSetupError('PASSWORD_SETUP_TOKEN_EXPIRED');
  }
}
