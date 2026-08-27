import pino from 'pino';
import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { sensitiveLogPaths } from '../src/infrastructure/logger.js';

describe('security log redaction', () => {
  it('redacts raw secrets and hashes at root and nested levels', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      }
    });
    const testLogger = pino({ redact: { paths: sensitiveLogPaths, censor: '[REDACTED]' } }, destination);
    const secrets = {
      password: 'root-password',
      passwordHash: '$argon2id$root-hash',
      token: 'root-token',
      tokenHash: 'root-token-hash',
      context: {
        password: 'nested-password',
        passwordHash: '$argon2id$nested-hash',
        token: 'nested-token',
        tokenHash: 'nested-token-hash'
      }
    };
    testLogger.info(secrets, 'sensitive event');

    for (const secret of [
      'root-password',
      '$argon2id$root-hash',
      'root-token',
      'root-token-hash',
      'nested-password',
      '$argon2id$nested-hash',
      'nested-token',
      'nested-token-hash'
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[REDACTED]');
  });
});
