import { describe, expect, it } from 'vitest';
import { argon2Config } from '../src/config/password-security.js';
import { PasswordHasher } from '../src/infrastructure/security/password-hasher.js';

describe('PasswordHasher', () => {
  it('creates salted Argon2id hashes with the centralized parameters', async () => {
    const hasher = new PasswordHasher();
    const password = 'uma frase senha segura';
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);

    expect(first).toMatch(/^\$argon2id\$/);
    expect(second).not.toBe(first);
    expect(await hasher.verify(first, password)).toBe(true);
    expect(await hasher.verify(first, 'senha incorreta')).toBe(false);
    expect(first).toContain(
      `$m=${argon2Config.memoryCost},t=${argon2Config.timeCost},p=${argon2Config.parallelism}$`
    );
  });
});
