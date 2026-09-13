import * as dotenv from 'dotenv';
import { z } from 'zod';
import * as path from 'path';

// Load environmental variables from root .env if it exists
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ConfigSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BACKUP_DIR: z.string().default(path.join(process.cwd(), 'backups')),
  UPLOAD_DIR: z.string().default(path.join(process.cwd(), 'uploads')),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info')
});

let parsedConfig: z.infer<typeof ConfigSchema>;

try {
  parsedConfig = ConfigSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingKeys = error.errors.map(err => err.path.join('.')).join(', ');
    console.error(`❌ Invalid environment variables configuration: Missing or invalid keys: [${missingKeys}]`);
  } else {
    console.error('❌ Environment parsing failed', error);
  }
  // Provide fallback or exit in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  // In development, mock a database url if not exists to avoid immediate startup crash
  parsedConfig = {
    PORT: 5000,
    NODE_ENV: 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
    JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_eipms_development_12345',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_sign_key_for_eipms_development_12345',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '7d',
    BACKUP_DIR: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
    UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    LOG_LEVEL: 'info'
  };
}

export const config = parsedConfig;
