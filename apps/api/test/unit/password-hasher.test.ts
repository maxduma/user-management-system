import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from '../../src/common/password-hasher';

// Low cost keeps the suite fast; production uses the stronger defaults.
const hasher = new ScryptPasswordHasher({ cost: 1024 });

describe('ScryptPasswordHasher', () => {
  it('verifies the original password', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    await expect(hasher.verify('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(hasher.verify('wrong password', hash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    const [first, second] = await Promise.all([hasher.hash('same'), hasher.hash('same')]);

    expect(first).not.toBe(second);
    expect(first).toMatch(/^scrypt\$1024\$8\$1\$/);
  });

  it('verifies hashes created with different parameters', async () => {
    const stronger = new ScryptPasswordHasher({ cost: 2048 });
    const hash = await stronger.hash('secret');

    await expect(hasher.verify('secret', hash)).resolves.toBe(true);
  });

  it.each(['', 'plain-text', 'bcrypt$1$2$3$a$b', 'scrypt$1024$8$1$'])(
    'rejects malformed stored hashes (%s)',
    async (stored) => {
      await expect(hasher.verify('secret', stored)).resolves.toBe(false);
    },
  );
});
