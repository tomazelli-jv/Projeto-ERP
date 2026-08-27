import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export function createDatabasePool(overrides = {}) {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    decimalNumbers: false,
    ...overrides
  });
}

export const database = createDatabasePool();

export async function checkDatabase() {
  const connection = await database.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

export async function closeDatabase() {
  await database.end();
}
