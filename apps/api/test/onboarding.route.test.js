import { onboardingInputSchema } from '@tomazelli/shared';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

describe('onboarding HTTP contract', () => {
  it('returns only the safe service result with 201', async () => {
    const result = {
      tenant: { id: 'tenant-id', name: 'Tenant', slug: 'tenant' },
      company: { id: 'company-id', legalName: 'Company' },
      branch: { id: 'branch-id', code: '001', tradeName: 'Matriz' },
      owner: { id: 'owner-id', name: 'Owner', email: 'owner@example.com' },
      subscription: { id: 'subscription-id', status: 'trialing', trialEndsAt: '2026-09-10T00:00:00.000Z' }
    };
    const onboardingService = { onboard: vi.fn().mockResolvedValue(result) };
    const response = await request(createApp({ onboardingService }))
      .post('/api/v1/onboarding')
      .send({ any: 'payload' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: result });
  });

  it('returns 400 with safe validation details for an invalid payload', async () => {
    const onboardingService = {
      onboard: vi.fn().mockImplementation((input) => onboardingInputSchema.parse(input))
    };
    const response = await request(createApp({ onboardingService }))
      .post('/api/v1/onboarding')
      .send({ tenantId: 'not-accepted' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.'
    });
    expect(response.body.error.details).toBeInstanceOf(Array);
    expect(JSON.stringify(response.body)).not.toContain('stack');
    expect(JSON.stringify(response.body)).not.toContain('sql');
  });
});
