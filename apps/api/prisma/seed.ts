/**
 * Idempotent seed: an admin account plus demo users so pagination (6 per
 * page) is visible straight away. Run with `npm run db:seed`, or in Docker via
 * `node dist/seed.js` (SEED_DEMO_DATA=true).
 */
import { ScryptPasswordHasher } from '../src/common/password-hasher';
import { createPrismaClient } from '../src/infrastructure/prisma';

const DEMO_USERS: Array<[firstName: string, lastName: string, status?: 'inactive']> = [
  ['Grace', 'Hopper'],
  ['Alan', 'Turing'],
  ['Katherine', 'Johnson'],
  ['Linus', 'Torvalds', 'inactive'],
  ['Margaret', 'Hamilton'],
  ['Tim', 'Berners-Lee'],
  ['Barbara', 'Liskov'],
  ['Dennis', 'Ritchie', 'inactive'],
  ['Radia', 'Perlman'],
  ['Ken', 'Thompson'],
  ['Frances', 'Allen'],
  ['John', 'McCarthy', 'inactive'],
  ['Hedy', 'Lamarr'],
  ['Donald', 'Knuth'],
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'Password123!';

  const prisma = createPrismaClient(databaseUrl);
  const hasher = new ScryptPasswordHasher();

  try {
    const demoHash = await hasher.hash(demoPassword);
    const base = Date.now() - DEMO_USERS.length * 60_000;
    const { count } = await prisma.user.createMany({
      data: DEMO_USERS.map(([firstName, lastName, status], index) => {
        // Distinct creation times keep the "newest first" order meaningful.
        const createdAt = new Date(base + index * 60_000);
        return {
          firstName,
          lastName,
          email: `${firstName}.${lastName}@example.com`.toLowerCase(),
          passwordHash: demoHash,
          status: status ?? 'active',
          createdAt,
          updatedAt: createdAt,
        };
      }),
      skipDuplicates: true,
    });

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        passwordHash: await hasher.hash(adminPassword),
      },
    });

    console.warn(`Seed complete: ${count} demo user(s) inserted, admin account ${admin.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
