// @legacyvault/database — singleton Prisma client export.
//
// Usage:
//   import { prisma, Prisma } from '@legacyvault/database';
//
// The client is configured for connection pooling and graceful shutdown.
// In NestJS, prefer the PrismaService wrapper at apps/api/src/common/prisma.service.ts.

import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error', 'warn'];

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: logLevels,
    // Error formatting: keep minimal in prod to avoid leaking schema details.
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export { Prisma };
export * from '@prisma/client';
