import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16).default('fincontrol_super_secret_jwt_key_sprint_1_dev_2026_finance'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(16).default('fincontrol_super_secret_refresh_key_sprint_1_dev_2026'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z
    .string()
    .default(
      'postgresql://postgres.qrkzkhryotlrfmmednju:Lu7%25CSWRbnxa0t%23DcTed@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
    )
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro na validação das variáveis de ambiente:', _env.error.format());
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;

// Garante que o Prisma e outras dependências sempre tenham a URL válida mesmo sem .env na nuvem
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
  process.env.DATABASE_URL = env.DATABASE_URL;
}
