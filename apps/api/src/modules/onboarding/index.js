import { database } from '../../infrastructure/database.js';
import { logger } from '../../infrastructure/logger.js';
import { OnboardingRepository } from './onboarding.repository.js';
import { OnboardingService } from './onboarding.service.js';

export const onboardingService = new OnboardingService({
  database,
  repository: new OnboardingRepository(),
  logger
});
