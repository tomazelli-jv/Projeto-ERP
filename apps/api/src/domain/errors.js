export class DomainError extends Error {
  constructor({ code, message, statusCode = 422, details }) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}
