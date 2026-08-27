import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './http/errors.js';
import { generateRequestId } from './http/request-id.js';
import { logger } from './infrastructure/logger.js';
import { onboardingService as defaultOnboardingService } from './modules/onboarding/index.js';
import { healthRouter } from './routes/health.js';
import { createOnboardingRouter } from './routes/onboarding.js';

export function createApp({ onboardingService = defaultOnboardingService } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.API_TRUST_PROXY ? 1 : false);
  app.use(
    pinoHttp({
      logger,
      genReqId: generateRequestId,
      customProps: (request) => ({ requestId: request.id })
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id']
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false
    })
  );
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/onboarding', createOnboardingRouter(onboardingService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
