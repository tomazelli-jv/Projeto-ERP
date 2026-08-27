import { z } from 'zod';
import { isValidCnpj, normalizeCnpj, normalizeDigits } from './cnpj.js';
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  MEMBERSHIP_STATUSES,
  ORGANIZATION_STATUSES,
  PLAN_LIMIT_KEY_VALUES,
  SUBSCRIPTION_STATUSES,
  TENANT_STATUSES
} from './constants.js';

export const uuidSchema = z.string().uuid();
export const tenantStatusSchema = z.enum(TENANT_STATUSES);
export const organizationStatusSchema = z.enum(ORGANIZATION_STATUSES);
export const membershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const planLimitKeySchema = z.enum(PLAN_LIMIT_KEY_VALUES);

export const cnpjSchema = z.string().transform(normalizeCnpj).refine(isValidCnpj, 'CNPJ inválido.');
export const optionalCnpjSchema = z
  .string()
  .nullish()
  .transform((value) => (value ? normalizeCnpj(value) : null))
  .refine((value) => value === null || isValidCnpj(value), 'CNPJ inválido.');

export const tenantInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  status: tenantStatusSchema.default('active'),
  timezone: z.string().trim().min(1).max(64).default(DEFAULT_TIMEZONE),
  locale: z.string().trim().min(2).max(10).default(DEFAULT_LOCALE)
});

export const companyInputSchema = z.object({
  tenantId: uuidSchema,
  legalName: z.string().trim().min(1).max(180),
  tradeName: z.string().trim().max(180).nullish(),
  taxIdRoot: z
    .string()
    .nullish()
    .transform((value) => (value ? normalizeDigits(value) : null))
    .refine((value) => value === null || /^\d{8}$/.test(value), 'A raiz do CNPJ deve possuir 8 dígitos.'),
  status: organizationStatusSchema.default('active')
});

export const branchInputSchema = z.object({
  tenantId: uuidSchema,
  companyId: uuidSchema,
  code: z.string().trim().min(1).max(50),
  legalName: z.string().trim().min(1).max(180),
  tradeName: z.string().trim().max(180).nullish(),
  taxId: optionalCnpjSchema,
  isHeadquarters: z.boolean().default(false),
  status: organizationStatusSchema.default('active'),
  email: z.string().trim().toLowerCase().email().max(254).nullish(),
  phone: z
    .string()
    .nullish()
    .transform((value) => (value ? normalizeDigits(value) : null))
    .refine((value) => value === null || /^\d{10,13}$/.test(value), 'Telefone inválido.')
});

export const userInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .nullish()
    .transform((value) => (value ? normalizeDigits(value) : null))
});
