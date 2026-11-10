import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env files automatically. Use Node's built-in loader
// for local development; in containers the variables come from the environment.
try {
  process.loadEnvFile();
} catch {
  // No .env file - rely on the process environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // A placeholder keeps `prisma generate` working without a database
    // (e.g. during Docker image builds); commands that connect need the real URL.
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
