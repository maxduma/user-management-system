import type { PasswordHasher } from '../../src/common/password-hasher';

/** Deterministic, instant hasher for tests (the real one is tested separately). */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    return stored === `hashed:${plain}`;
  }
}
