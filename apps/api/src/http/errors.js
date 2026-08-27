export class AppError extends Error {
  constructor({ code, message, statusCode = 500, details }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
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
  const isOperationalError = error instanceof AppError || error.isOperational === true;
  const statusCode = isOperationalError ? error.statusCode : 500;

  request.log.error({ err: error, statusCode }, 'Request failed');
  response.status(statusCode).json({
    error: {
      code: isOperationalError ? error.code : 'INTERNAL_SERVER_ERROR',
      message: isOperationalError ? error.message : 'Ocorreu um erro interno.',
      ...(isOperationalError && error.details ? { details: error.details } : {}),
      requestId: request.id
    }
  });
}
