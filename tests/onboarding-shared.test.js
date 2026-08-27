import {
  normalizeTenantSlug,
  onboardingInputSchema,
  ONBOARDING_DEFAULT_BRANCH_CODE
} from '@tomazelli/shared';
import { describe, expect, it } from 'vitest';

const validPayload = {
  tenant: { name: 'Cliente Inicial', slug: 'Cliente São José' },
  company: { legalName: 'Cliente Inicial Ltda.', tradeName: 'Cliente', taxId: '11.222.333/0001-81' },
  branch: {
    legalName: 'Cliente Inicial Ltda.',
    tradeName: 'Matriz',
    email: ' FILIAL@EXAMPLE.COM ',
    phone: '(11) 99999-9999',
    address: {
      postalCode: '01.001-000',
      street: 'Praça da Sé',
      number: '1',
      district: 'Sé',
      city: 'São Paulo',
      state: 'sp'
    }
  },
  owner: { name: 'Proprietário', email: ' OWNER@EXAMPLE.COM ', phone: '(11) 98888-7777' },
  planCode: 'starter'
};

describe('onboarding shared contract', () => {
  it('normalizes safe tenant slugs', () => {
    expect(normalizeTenantSlug('  Cliente São José / Matriz  ')).toBe('cliente-sao-jose-matriz');
  });

  it('normalizes a valid payload and applies server-safe defaults', () => {
    const result = onboardingInputSchema.parse(validPayload);
    expect(result.tenant.slug).toBe('cliente-sao-jose');
    expect(result.company.taxId).toBe('11222333000181');
    expect(result.branch.code).toBe(ONBOARDING_DEFAULT_BRANCH_CODE);
    expect(result.branch.address).toMatchObject({ postalCode: '01001000', state: 'SP', countryCode: 'BR' });
    expect(result.owner.email).toBe('owner@example.com');
    expect(result.planCode).toBe('STARTER');
  });

  it('rejects invalid payloads and arbitrary authority fields', () => {
    expect(() =>
      onboardingInputSchema.parse({ ...validPayload, company: { ...validPayload.company, taxId: '1' } })
    ).toThrow();
    expect(() => onboardingInputSchema.parse({ ...validPayload, tenantId: crypto.randomUUID() })).toThrow();
    expect(() =>
      onboardingInputSchema.parse({
        ...validPayload,
        branch: { ...validPayload.branch, isHeadquarters: false }
      })
    ).toThrow();
  });
});
