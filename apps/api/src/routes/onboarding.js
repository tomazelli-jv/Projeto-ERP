import { Router } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../http/errors.js';

export function createOnboardingRouter(onboardingService) {
  const router = Router();

  router.post('/', async (request, response, next) => {
    try {
      const result = await onboardingService.onboard(request.body, { requestId: request.id });
      response.status(201).json({ data: result });
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
      next(error);
    }
  });

  return router;
}
