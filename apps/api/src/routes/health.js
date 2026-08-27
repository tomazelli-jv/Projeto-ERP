import { Router } from 'express';
import { checkDatabase } from '../infrastructure/database.js';

export const healthRouter = Router();

healthRouter.get('/live', (_request, response) => {
  response.json({ data: { status: 'ok' } });
});

healthRouter.get('/ready', async (request, response) => {
  try {
    await checkDatabase();
    response.json({ data: { status: 'ready', database: 'available' } });
  } catch (error) {
    request.log.error({ err: error }, 'Readiness check failed');
    response.status(503).json({
      error: {
        code: 'SERVICE_NOT_READY',
        message: 'Serviço temporariamente indisponível.',
        requestId: request.id
      }
    });
  }
});
