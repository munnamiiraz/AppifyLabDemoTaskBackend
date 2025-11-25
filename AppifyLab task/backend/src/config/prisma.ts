// src/config/prisma.ts
import type { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

let prisma: PrismaClient | null = null;

const createPrismaClient = (): PrismaClient => {
  try {
    // dynamic require to avoid import-time errors if generated client not present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient: PC } = require('@prisma/client');
    return new PC({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  } catch (err) {
    // give a clear actionable error
    console.error('Prisma dynamic require failed. Did you run `npx prisma generate`?');
    throw err;
  }
};

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

export const connectDB = async (): Promise<void> => {
  try {
    const client = getPrisma();
    await client.$connect();
    console.log('✅ Prisma connected to DB');
  } catch (err) {
    console.error('Prisma connection error:', err);
    throw err;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};

export default getPrisma;
