import { DomainError } from '../../domain/errors.js';

const definitions = {
  TENANT_SLUG_ALREADY_EXISTS: ['Este endereço de conta já está em uso.', 409],
  CNPJ_ALREADY_REGISTERED: ['Este CNPJ já está cadastrado.', 409],
  PLAN_NOT_AVAILABLE: ['O plano informado não está disponível.', 422],
  TENANT_LIMIT_CONFIGURATION_INVALID: ['O plano não suporta a estrutura inicial necessária.', 422],
  MEMBERSHIP_ALREADY_EXISTS: ['O usuário já possui vínculo com esta conta.', 409],
  ONBOARDING_CONFLICT: ['Já existe um cadastro conflitante.', 409]
};

export function onboardingError(code) {
  const [message, statusCode] = definitions[code] ?? ['Não foi possível concluir o cadastro.', 422];
  return new DomainError({ code, message, statusCode });
}

export function mapOnboardingDatabaseError(error) {
  if (error?.code !== 'ER_DUP_ENTRY') return error;
  const internalMessage = String(error.sqlMessage ?? error.message ?? '');
  if (internalMessage.includes('uq_tenants_slug')) return onboardingError('TENANT_SLUG_ALREADY_EXISTS');
  if (internalMessage.includes('uq_branches_tax_id')) return onboardingError('CNPJ_ALREADY_REGISTERED');
  if (internalMessage.includes('uq_memberships_tenant_user'))
    return onboardingError('MEMBERSHIP_ALREADY_EXISTS');
  return onboardingError('ONBOARDING_CONFLICT');
}
