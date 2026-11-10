import { buildApp } from './app';
import { loadEnv } from './config/env';
import { createContainer } from './container';

const env = loadEnv();
const container = createContainer(env);
const app = await buildApp({ config: env, ...container });

app.addHook('onClose', async () => {
  await container.dispose();
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'Shutting down gracefully');
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.fatal({ err: error }, 'Failed to start server');
  await container.dispose();
  process.exit(1);
}
