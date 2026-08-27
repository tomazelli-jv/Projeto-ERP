import { createUuid, PASSWORD_SETUP_PURPOSE } from '@tomazelli/shared';
import { passwordSetupConfig } from '../../config/password-security.js';
import {
  generatePasswordSetupToken,
  hashPasswordSetupToken
} from '../../infrastructure/security/password-setup-token.js';

export class PasswordSetupTokenService {
  constructor({ repository, notifier, logger, clock = () => new Date(), config = passwordSetupConfig }) {
    this.repository = repository;
    this.notifier = notifier;
    this.logger = logger;
    this.clock = clock;
    this.config = config;
  }

  async issueForUser(connection, userId) {
    const user = await this.repository.findUserByIdForUpdate(connection, userId);
    if (!user) throw new Error('Password setup user was not found');

    const credential = await this.repository.findCredentialByUserId(connection, userId);
    if (credential) return null;

    const createdAt = this.clock();
    const expiresAt = new Date(createdAt.getTime() + this.config.tokenTtlMs);
    const token = generatePasswordSetupToken(this.config.tokenBytes);
    const tokenHash = hashPasswordSetupToken(token);

    const revokedCount = await this.repository.revokeActiveTokens(connection, {
      userId,
      purpose: PASSWORD_SETUP_PURPOSE,
      revokedAt: createdAt
    });
    await this.repository.createToken(connection, {
      id: createUuid(),
      userId,
      tokenHash,
      purpose: PASSWORD_SETUP_PURPOSE,
      expiresAt,
      createdAt
    });
    this.logger.info(
      { event: 'password_setup_token_issued', userId, revokedPreviousTokens: revokedCount },
      'Password setup token issued'
    );
    return { userId, email: user.email, token, expiresAt };
  }

  async deliver(issuance) {
    if (!issuance) return;
    await this.notifier.deliver({
      recipient: issuance.email,
      token: issuance.token,
      expiresAt: issuance.expiresAt
    });
  }
}
