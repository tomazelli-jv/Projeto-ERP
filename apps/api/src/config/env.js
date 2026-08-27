import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  API_TRUST_PROXY: booleanFromString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(3306),
  DB_NAME: z.string().min(1).default('tomazelli_erp'),
  DB_USER: z.string().min(1).default('tomazelli'),
  DB_PASSWORD: z.string().default('tomazelli_local'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().max(100).default(10),
  PASSWORD_SETUP_TOKEN_TTL_HOURS: z.coerce.number().int().positive().max(168).default(24),
  ARGON2_MEMORY_COST_KIB: z.coerce.number().int().min(8192).max(262144).default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().min(1).max(10).default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(8).default(1)
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

if (result.data.NODE_ENV === 'production' && result.data.DB_PASSWORD === 'tomazelli_local') {
  throw new Error('DB_PASSWORD must not use the local default in production');
}

export const env = Object.freeze(result.data);
