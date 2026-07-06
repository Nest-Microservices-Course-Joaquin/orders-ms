import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).default(3000),
  DATABASE_URL: z.string(),
  NATS_SERVERS: z.array(z.string()).min(1),
  // PRODUCTS_MS_HOST: z.string().default('localhost'),
  // PRODUCTS_MS_PORT: z.coerce.number().int().min(1).default(3001),
});

export type EnvVars = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse({
    ...config,
    NATS_SERVERS: (config.NATS_SERVERS as string)?.split(','),
  });

  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }

  return result.data;
}

export const envs = validate(process.env);
