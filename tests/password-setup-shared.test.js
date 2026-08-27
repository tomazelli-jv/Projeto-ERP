import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordSchema,
  passwordSetupConfirmInputSchema
} from '@tomazelli/shared';
import { describe, expect, it } from 'vitest';

describe('password setup shared contract', () => {
  it('accepts passphrases and preserves every password character', () => {
    const password = '  uma frase senha longa  ';
    expect(passwordSchema.parse(password)).toBe(password);
    expect(passwordSetupConfirmInputSchema.parse({ token: 'token', password })).toEqual({
      token: 'token',
      password
    });
  });

  it('enforces length and rejects whitespace-only values without echoing the secret', () => {
    expect(() => passwordSchema.parse('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toThrow();
    expect(() => passwordSchema.parse('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toThrow();
    const secret = ' '.repeat(PASSWORD_MIN_LENGTH);
    const result = passwordSchema.safeParse(secret);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error.issues)).not.toContain(`"${secret}"`);
  });

  it.each(['userId', 'tenantId', 'membershipId', 'passwordHash', 'status', 'purpose', 'createdAt'])(
    'rejects the authority field %s',
    (field) => {
      expect(() =>
        passwordSetupConfirmInputSchema.parse({
          token: 'token',
          password: 'frase senha segura',
          [field]: 'forbidden'
        })
      ).toThrow();
    }
  );
});
