import { PrismaClient } from '@prisma/client';

// Một instance dùng chung cho toàn app (tránh mở nhiều connection pool khi --watch).
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;
