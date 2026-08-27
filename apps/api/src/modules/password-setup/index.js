import { database } from '../../infrastructure/database.js';
import { logger } from '../../infrastructure/logger.js';
import { PasswordSetupNotifier } from '../../infrastructure/notifications/password-setup-notifier.js';
import { PasswordHasher } from '../../infrastructure/security/password-hasher.js';
import { PasswordSetupRepository } from './password-setup.repository.js';
import { PasswordSetupService } from './password-setup.service.js';
import { PasswordSetupTokenService } from './password-setup-token.service.js';

export const passwordSetupRepository = new PasswordSetupRepository();
export const passwordSetupNotifier = new PasswordSetupNotifier();

export const passwordSetupTokenService = new PasswordSetupTokenService({
  repository: passwordSetupRepository,
  notifier: passwordSetupNotifier,
  logger
});

export const passwordSetupService = new PasswordSetupService({
  database,
  repository: passwordSetupRepository,
  passwordHasher: new PasswordHasher(),
  logger
});
