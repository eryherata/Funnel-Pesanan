
import dotenv from 'dotenv';

dotenv.config();

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

export const env = {
  port: Number(process.env.PORT || 3000),
  appOrigin: process.env.APP_ORIGIN || '*',
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || 'pantauan_pesanan',
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  authRequired: toBool(process.env.AUTH_REQUIRED, false),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 7),
  trustProxy: toBool(process.env.TRUST_PROXY, true),
  importMaxRows: Number(process.env.IMPORT_MAX_ROWS || 2000),
  importMaxErrors: Number(process.env.IMPORT_MAX_ERRORS || 100),
};
