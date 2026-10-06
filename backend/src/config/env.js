const path = require('node:path');
const { z } = require('zod');

const emptyToUndefined = (value) => (value === '' ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).default('false')),
  PG_CA_CERT_PATH: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^[1-9]\d*[smhd]$/, 'JWT_EXPIRES_IN must look like 15m, 12h or 1d')
    .default('1d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CLINIC_TIMEZONE: z
    .string()
    .regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/, 'CLINIC_TIMEZONE must be an IANA zone such as Africa/Casablanca')
    .default('Africa/Casablanca'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  UPLOAD_DIR: z.preprocess(emptyToUndefined, z.string().default(path.resolve(__dirname, '../../uploads'))),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
}

const env = parsed.data;

module.exports = {
  nodeEnv: env.NODE_ENV,
  isTest: env.NODE_ENV === 'test',
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  database: {
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true',
    caCertPath: env.PG_CA_CERT_PATH,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'clinicflow-api',
    audience: 'clinicflow-client',
  },
  clientOrigins: env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean),
  clinicTimezone: env.CLINIC_TIMEZONE,
  bcryptRounds: env.BCRYPT_ROUNDS,
  uploadDir: path.resolve(env.UPLOAD_DIR),
};
