export class AppError extends Error {
  constructor({ code, message, statusCode = 500, details }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(request, response, next) {
  next(
    new AppError({
      code: 'ROUTE_NOT_FOUND',
      message: 'Recurso não encontrado.',
      statusCode: 404
    })
  );
}

export function errorHandler(error, request, response, _next) {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;

  request.log.error({ err: error, statusCode }, 'Request failed');
  response.status(statusCode).json({
    error: {
      code: isAppError ? error.code : 'INTERNAL_SERVER_ERROR',
      message: isAppError ? error.message : 'Ocorreu um erro interno.',
      ...(isAppError && error.details ? { details: error.details } : {}),
      requestId: request.id
    }
  });
}
