import pino from 'pino';
import { env } from '../config/env.js';

const transport =
  env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined;

export const sensitiveLogPaths = Object.freeze([
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.secret'
]);

export const logger = pino({
  level: env.LOG_LEVEL,
  transport,
  redact: {
    paths: sensitiveLogPaths,
    censor: '[REDACTED]'
  }
});
