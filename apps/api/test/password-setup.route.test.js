import { DomainError } from '../src/domain/errors.js';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

describe('password setup HTTP contract', () => {
  it('returns only the minimum success envelope', async () => {
    const passwordSetupService = { confirm: vi.fn().mockResolvedValue({ passwordDefined: true }) };
    const response = await request(createApp({ passwordSetupService }))
      .post('/api/v1/auth/password/setup/confirm')
      .send({ token: 'raw-token', password: 'uma frase senha segura' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { passwordDefined: true } });
    expect(JSON.stringify(response.body)).not.toContain('token');
    expect(JSON.stringify(response.body)).not.toContain('hash');
  });

  it('rejects invalid and extra fields with safe validation errors', async () => {
    const passwordSetupService = {
      confirm: vi.fn().mockImplementation(async () => {
        const { passwordSetupConfirmInputSchema } = await import('@tomazelli/shared');
        return passwordSetupConfirmInputSchema.parse({
          token: 'raw-token',
          password: 'uma frase senha segura',
          userId: 'forbidden'
        });
      })
    };
    const response = await request(createApp({ passwordSetupService }))
      .post('/api/v1/auth/password/setup/confirm')
      .send({ any: 'payload' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('stack');
    expect(JSON.stringify(response.body)).not.toContain('sql');
  });

  it.each([
    'PASSWORD_SETUP_TOKEN_INVALID',
    'PASSWORD_SETUP_TOKEN_EXPIRED',
    'PASSWORD_SETUP_TOKEN_ALREADY_USED',
    'PASSWORD_SETUP_TOKEN_REVOKED',
    'PASSWORD_SETUP_TOKEN_PURPOSE_INVALID'
  ])('uses an indistinguishable public response for %s', async (code) => {
    const passwordSetupService = {
      confirm: vi
        .fn()
        .mockRejectedValue(new DomainError({ code, message: `private ${code}`, statusCode: 422 }))
    };
    const response = await request(createApp({ passwordSetupService }))
      .post('/api/v1/auth/password/setup/confirm')
      .send({ token: 'raw-token', password: 'uma frase senha segura' });
    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: 'PASSWORD_SETUP_TOKEN_INVALID',
      message: 'Não foi possível validar o link de definição de senha.'
    });
  });

  it('applies a dedicated rate limit without creating another limiter library', async () => {
    const passwordSetupService = { confirm: vi.fn().mockResolvedValue({ passwordDefined: true }) };
    const app = createApp({ passwordSetupService, passwordSetupRateLimit: 2 });
    const payload = { token: 'raw-token', password: 'uma frase senha segura' };
    await request(app).post('/api/v1/auth/password/setup/confirm').send(payload).expect(200);
    await request(app).post('/api/v1/auth/password/setup/confirm').send(payload).expect(200);
    const response = await request(app).post('/api/v1/auth/password/setup/confirm').send(payload);
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('does not expose a login endpoint', async () => {
    const response = await request(createApp()).post('/api/v1/auth/login').send({});
    expect(response.status).toBe(404);
  });
});
