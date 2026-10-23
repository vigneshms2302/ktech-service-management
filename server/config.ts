import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface ServerConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string[];
  DATABASE_URL?: string;
  KTECH_SAAS_DB_PATH?: string;
}

export function validateConfig(): ServerConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const port = parseInt(process.env.PORT || '5000', 10);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    if (nodeEnv === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is required in production mode! Server startup aborted for security.'
      );
    }
  }

  // Fallback secret ONLY permitted in development or test environments
  const effectiveJwtSecret = jwtSecret && jwtSecret.trim() !== ''
    ? jwtSecret.trim()
    : (nodeEnv === 'test' ? 'test-environment-jwt-secret-key-32chars-min' : 'ktech-saas-dev-secret-do-not-use-in-prod');

  const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:4173';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    PORT: isNaN(port) ? 5000 : port,
    NODE_ENV: nodeEnv,
    JWT_SECRET: effectiveJwtSecret,
    ALLOWED_ORIGINS: allowedOrigins,
    DATABASE_URL: process.env.DATABASE_URL,
    KTECH_SAAS_DB_PATH: process.env.KTECH_SAAS_DB_PATH,
  };
}

export const config = validateConfig();
