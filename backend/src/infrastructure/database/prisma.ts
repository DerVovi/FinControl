import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_FALLBACK_URL =
  'postgresql://postgres.qrkzkhryotlrfmmednju:Lu7%25CSWRbnxa0t%23DcTed@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
  process.env.DATABASE_URL = SUPABASE_FALLBACK_URL;
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
