import {
  branchInputSchema,
  companyInputSchema,
  createUuid,
  hasOnlyDigits,
  isValidCnpj,
  membershipStatusSchema,
  normalizeCnpj,
  organizationStatusSchema,
  subscriptionStatusSchema,
  tenantInputSchema,
  tenantStatusSchema,
  userInputSchema
} from '@tomazelli/shared';
import { describe, expect, it } from 'vitest';

describe('shared SaaS domain', () => {
  it('generates UUID identifiers centrally', () => {
    expect(createUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('validates tenant statuses', () => {
    expect(tenantStatusSchema.parse('active')).toBe('active');
    expect(() => tenantStatusSchema.parse('inactive')).toThrow();
  });

  it('validates membership and subscription statuses', () => {
    expect(organizationStatusSchema.parse('inactive')).toBe('inactive');
    expect(membershipStatusSchema.parse('blocked')).toBe('blocked');
    expect(subscriptionStatusSchema.parse('trialing')).toBe('trialing');
    expect(() => membershipStatusSchema.parse('cancelled')).toThrow();
    expect(() => subscriptionStatusSchema.parse('inactive')).toThrow();
  });

  it('normalizes and validates CNPJ', () => {
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
    expect(hasOnlyDigits('11222333000181')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('applies tenant defaults and normalizes its slug', () => {
    const tenant = tenantInputSchema.parse({ name: 'Tomazelli Cliente', slug: 'cliente-tomazelli' });
    expect(tenant).toMatchObject({
      status: 'active',
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR'
    });
  });

  it('normalizes company and branch tax identifiers', () => {
    const tenantId = createUuid();
    const companyId = createUuid();
    expect(
      companyInputSchema.parse({ tenantId, legalName: 'Empresa Ltda.', taxIdRoot: '11.222.333' }).taxIdRoot
    ).toBe('11222333');
    expect(
      branchInputSchema.parse({
        tenantId,
        companyId,
        code: 'MATRIZ',
        legalName: 'Empresa Ltda.',
        taxId: '11.222.333/0001-81'
      }).taxId
    ).toBe('11222333000181');
  });

  it('normalizes global user emails to lowercase', () => {
    const user = userInputSchema.parse({ name: 'João', email: '  JOAO@EXAMPLE.COM ' });
    expect(user.email).toBe('joao@example.com');
  });
});
