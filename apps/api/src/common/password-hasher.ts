import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, stored: string): Promise<boolean>;
}

export interface ScryptParams {
  /** CPU/memory cost (N), a power of two. */
  cost: number;
  blockSize: number;
  parallelization: number;
  keyLength: number;
  saltLength: number;
}

const DEFAULT_PARAMS: ScryptParams = {
  cost: 2 ** 15,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
  saltLength: 16,
};

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/**
 * scrypt-based hasher using only `node:crypto` (no native add-ons).
 * Hashes are self-describing: `scrypt$N$r$p$salt$hash`, so parameters can be
 * strengthened later without invalidating existing passwords.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  private readonly params: ScryptParams;

  constructor(params: Partial<ScryptParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  async hash(plain: string): Promise<string> {
    const { cost, blockSize, parallelization, keyLength, saltLength } = this.params;
    const salt = randomBytes(saltLength);
    const key = await scrypt(
      plain,
      salt,
      keyLength,
      this.options(cost, blockSize, parallelization),
    );
    return [
      'scrypt',
      cost,
      blockSize,
      parallelization,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const [algorithm, cost, blockSize, parallelization, salt, hash] = stored.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;

    const expected = Buffer.from(hash, 'base64');
    const actual = await scrypt(
      plain,
      Buffer.from(salt, 'base64'),
      expected.length,
      this.options(Number(cost), Number(blockSize), Number(parallelization)),
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private options(N: number, r: number, p: number): ScryptOptions {
    // scrypt needs ~128 * N * r bytes; leave head-room above Node's 32 MiB default.
    return { N, r, p, maxmem: 256 * N * r };
  }
}
