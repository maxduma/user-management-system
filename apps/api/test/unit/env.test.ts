import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({ DATABASE_URL });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      SESSION_TTL_HOURS: 24,
      CORS_ORIGIN: [],
      TRUST_PROXY: false,
      SWAGGER_ENABLED: true,
    });
  });

  it('parses numbers, booleans and comma-separated origins', () => {
    const env = loadEnv({
      DATABASE_URL,
      PORT: '8080',
      TRUST_PROXY: 'true',
      SWAGGER_ENABLED: '0',
      CORS_ORIGIN: 'http://a.test, http://b.test',
    });

    expect(env).toMatchObject({
      PORT: 8080,
      TRUST_PROXY: true,
      SWAGGER_ENABLED: false,
      CORS_ORIGIN: ['http://a.test', 'http://b.test'],
    });
  });

  it('fails fast with a readable message', () => {
    const load = () => loadEnv({ DATABASE_URL: 'mysql://nope', PORT: 'abc' });

    expect(load).toThrow(/^Invalid environment configuration:/);
    expect(load).toThrow(/- DATABASE_URL: /);
    expect(load).toThrow(/- PORT: /);
  });
});
