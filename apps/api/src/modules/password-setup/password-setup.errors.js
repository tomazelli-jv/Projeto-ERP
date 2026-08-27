import { DomainError } from '../../domain/errors.js';

const definitions = {
  PASSWORD_SETUP_TOKEN_INVALID: ['Não foi possível validar o link de definição de senha.', 422],
  PASSWORD_SETUP_TOKEN_EXPIRED: ['O token de definição de senha expirou.', 422],
  PASSWORD_SETUP_TOKEN_ALREADY_USED: ['O token de definição de senha já foi utilizado.', 422],
  PASSWORD_SETUP_TOKEN_REVOKED: ['O token de definição de senha foi revogado.', 422],
  PASSWORD_SETUP_TOKEN_PURPOSE_INVALID: ['A finalidade do token é inválida.', 422],
  PASSWORD_ALREADY_DEFINED: ['A senha deste usuário já foi definida.', 409],
  PASSWORD_POLICY_VIOLATION: ['A senha não atende à política de segurança.', 400],
  PASSWORD_SETUP_TOKEN_CONSUMPTION_FAILED: ['Não foi possível consumir o token.', 409]
};

const privateTokenCodes = new Set([
  'PASSWORD_SETUP_TOKEN_INVALID',
  'PASSWORD_SETUP_TOKEN_EXPIRED',
  'PASSWORD_SETUP_TOKEN_ALREADY_USED',
  'PASSWORD_SETUP_TOKEN_REVOKED',
  'PASSWORD_SETUP_TOKEN_PURPOSE_INVALID'
]);

export function passwordSetupError(code) {
  const [message, statusCode] = definitions[code] ?? definitions.PASSWORD_SETUP_TOKEN_INVALID;
  return new DomainError({ code, message, statusCode });
}

export function toPublicPasswordSetupError(error) {
  if (privateTokenCodes.has(error?.code)) return passwordSetupError('PASSWORD_SETUP_TOKEN_INVALID');
  return error;
}
