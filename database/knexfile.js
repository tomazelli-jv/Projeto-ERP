import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseDirectory = dirname(fileURLToPath(import.meta.url));

const allowedEnvironments = new Set(['development', 'test', 'staging', 'production']);
const environment = process.env.NODE_ENV ?? 'development';

if (!allowedEnvironments.has(environment)) {
  throw new Error(`Unsupported NODE_ENV: ${environment}`);
}

const requiredInProduction = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
if (environment === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing production database variables: ${missing.join(', ')}`);
}

const config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? `tomazelli_erp${environment === 'test' ? '_test' : ''}`,
    user: process.env.DB_USER ?? 'tomazelli',
    password: process.env.DB_PASSWORD ?? 'tomazelli_local',
    charset: 'utf8mb4',
    timezone: 'Z'
  },
  pool: { min: 0, max: Number(process.env.DB_CONNECTION_LIMIT ?? 10) },
  migrations: {
    directory: join(databaseDirectory, 'migrations'),
    tableName: 'knex_migrations',
    extension: 'js'
  },
  seeds: {
    directory: join(databaseDirectory, 'seeds'),
    extension: 'js'
  }
};

export default config;
