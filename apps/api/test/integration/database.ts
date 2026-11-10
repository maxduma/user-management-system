import { createPrismaClient } from '../../src/infrastructure/prisma';

/**
 * The integration suite never touches the development database: it uses
 * TEST_DATABASE_URL, or DATABASE_URL with the database name suffixed `_test`.
 */
export function testDatabaseUrl(): string {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the environment (CI).
  }
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL or DATABASE_URL to run the integration tests');
  }
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/^\//, '')}_test`;
  return url.toString();
}

export function createTestPrisma() {
  return createPrismaClient(testDatabaseUrl());
}

export async function truncateAll(prisma: ReturnType<typeof createTestPrisma>) {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "sessions", "users" CASCADE');
}
