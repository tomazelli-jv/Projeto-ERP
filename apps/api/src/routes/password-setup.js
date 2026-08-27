import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { AppError } from '../http/errors.js';
import { toPublicPasswordSetupError } from '../modules/password-setup/password-setup.errors.js';

export function createPasswordSetupRouter(passwordSetupService, { limit = 5 } = {}) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas. Aguarde antes de tentar novamente.'
      }
    }
  });

  router.post('/confirm', limiter, async (request, response, next) => {
    try {
      const result = await passwordSetupService.confirm(request.body, { requestId: request.id });
      response.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Os dados informados são inválidos.',
            statusCode: 400,
            details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message }))
          })
        );
        return;
      }
      next(toPublicPasswordSetupError(error));
    }
  });

  return router;
}
