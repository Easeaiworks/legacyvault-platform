// Singleton Prisma client for Next.js API routes + Server Actions.
// In serverless environments we want a single shared client to avoid
// exhausting the connection pool on each request. In dev we also guard
// against HMR creating multiple instances.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
