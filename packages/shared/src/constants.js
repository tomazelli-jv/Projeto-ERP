export const TENANT_STATUSES = Object.freeze(['active', 'suspended', 'cancelled']);
export const ORGANIZATION_STATUSES = Object.freeze(['active', 'inactive']);
export const MEMBERSHIP_STATUSES = Object.freeze(['pending', 'active', 'blocked', 'inactive']);
export const SUBSCRIPTION_STATUSES = Object.freeze([
  'trialing',
  'active',
  'suspended',
  'cancelled',
  'expired'
]);

export const PLAN_LIMIT_KEYS = Object.freeze({
  MAX_COMPANIES: 'max_companies',
  MAX_BRANCHES: 'max_branches',
  MAX_USERS: 'max_users'
});

export const PLAN_LIMIT_KEY_VALUES = Object.freeze(Object.values(PLAN_LIMIT_KEYS));
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_LOCALE = 'pt-BR';
export const DEFAULT_COUNTRY_CODE = 'BR';
export const ONBOARDING_DEFAULT_BRANCH_CODE = '001';
export const ONBOARDING_TRIAL_DAYS = 14;
