import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { testDatabaseUrl } from './database';

/** Creates the test database if needed and applies all migrations to it. */
export default async function setup() {
  const url = testDatabaseUrl();
  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));

  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = '/postgres';
  const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    if (!rowCount) {
      await client.query(`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`);
    }
  } finally {
    await client.end();
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
