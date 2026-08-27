import { env } from './env.js';

export const argon2Config = Object.freeze({
  memoryCost: env.ARGON2_MEMORY_COST_KIB,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
  hashLength: 32
});

export const passwordSetupConfig = Object.freeze({
  tokenBytes: 32,
  tokenTtlMs: env.PASSWORD_SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000
});
