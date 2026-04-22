import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  FIELD_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    }),
  KMS_KEY_ID: z.string().optional(),

  AUTH_PROVIDER: z.enum(['workos', 'clerk', 'local']).default('local'),
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),
  WORKOS_REDIRECT_URI: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TRUST_PROXY: z.coerce.boolean().default(false),

  // Set to 'true' ONLY on the hosted demo environment. Enables /auth/demo/login
  // and the top-of-page DEMO banner. The prod safety rails below relax the
  // AUTH_PROVIDER=local check when DEMO_MODE=true, because the demo does not
  // require WorkOS.
  DEMO_MODE: z.enum(['true', 'false']).default('false'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${errors}`);
  }
  const env = parsed.data;

  // Production safety rails.
  if (env.NODE_ENV === 'production') {
    const isDemoDeployment = env.DEMO_MODE === 'true';

    if (env.AUTH_PROVIDER === 'local' && !isDemoDeployment) {
      throw new Error(
        'AUTH_PROVIDER=local is forbidden in production. Set DEMO_MODE=true to allow it on the hosted demo.',
      );
    }
    if (env.JWT_SECRET.startsWith('CHANGE_ME')) {
      throw new Error('JWT_SECRET still contains placeholder value in production.');
    }
    if (isDemoDeployment) {
      // Log loudly so the ops dashboard shows this is a demo, not a real prod.
      console.warn(
        '[env] DEMO_MODE=true — /auth/demo/login is exposed. This environment is NOT for real users.',
      );
    }
  }
  return env;
}
