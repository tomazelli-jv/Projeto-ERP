import { formatCnpj, formatCpf, formatCep, normalizeCnpj, validateCnpj } from './business-formatters.js';

// A API usa role Administrador; nome ADM não é uma credencial de autorização.
export function canManageBusiness(claims) {
  const role = claims?.role ?? claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  return (Array.isArray(role) ? role : [role]).includes('Administrador');
}
// Cache separado por usuário e contexto do JWT, inclusive para administradores de várias empresas.
export const businessScope = (claims) => [
  'business',
  String(claims?.sub ?? ''),
  String(claims?.empresaId ?? ''),
  String(claims?.lojaId ?? '')
];
export const addressLines = (loja) =>
  [
    loja.rua?.trim(),
    [loja.cidade?.trim(), loja.uf?.trim()].filter(Boolean).join(' - '),
    formatCep(loja.cep)
  ].filter(Boolean);
export const documentLabel = (loja) => (loja.tipoPessoa === 1 ? 'CPF' : 'CNPJ');
export const documentValue = (loja) =>
  (loja.tipoPessoa === 1 ? formatCpf(loja.documento) : formatCnpj(loja.documento)) || 'Não informado';
// CNPJ é string alfanumérica. CPF usa somente remoção de sua pontuação, sem conversão numérica.
export function lojaPayload(empresaId, form, editing) {
  const nullable = (value) => String(value ?? '').trim() || null;
  return {
    empresaId: Number(empresaId),
    nome: form.nome.trim(),
    razaoSocial: nullable(form.razaoSocial),
    tipoPessoa: Number(form.tipoPessoa),
    documento:
      Number(form.tipoPessoa) === 2 ? normalizeCnpj(form.documento) : form.documento.replace(/[.\-\s]/g, ''),
    telefone: nullable(String(form.telefone ?? '').replace(/\D/g, '')),
    email: nullable(form.email),
    cep: nullable(String(form.cep ?? '').replace(/\D/g, '')),
    cidade: nullable(form.cidade),
    rua: nullable(form.rua),
    uf: nullable(form.uf),
    ...(editing ? { ativo: form.ativo } : {})
  };
}
export function validateLoja(form) {
  // Campos opcionais, mas quando preenchidos devem estar completos; não converter para Number.
  if (form.telefone && ![10, 11].includes(form.telefone.replace(/\D/g, '').length))
    return 'Informe o telefone com DDD e 10 ou 11 dígitos.';
  if (form.cep && form.cep.replace(/\D/g, '').length !== 8) return 'Informe os 8 dígitos do CEP.';
  if (!form.nome.trim()) return 'Informe o nome da loja.';
  if (form.nome.length > 100 || form.razaoSocial.length > 100)
    return 'Nome e razão social devem ter até 100 caracteres.';
  if (![1, 2].includes(Number(form.tipoPessoa))) return 'Selecione o tipo de pessoa.';
  if (Number(form.tipoPessoa) === 2 && !validateCnpj(form.documento)) return 'CNPJ inválido.';
  if (Number(form.tipoPessoa) === 1 && !/^\d{11}$/.test(form.documento.replace(/[.\-\s]/g, '')))
    return 'Informe os 11 dígitos do CPF.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Informe um e-mail válido.';
  return '';
}
// Não repassa mensagens/stack traces arbitrários do servidor à interface.
export function businessError(error) {
  return (
    {
      400: 'Confira os dados informados. A solicitação foi rejeitada.',
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Você não possui permissão para acessar Empresas e Lojas.',
      404: 'Recurso não encontrado.',
      409: 'Já existe um cadastro com esses dados.',
      422: 'Confira os dados informados. A validação não foi concluída.'
    }[error?.status] ?? 'Não foi possível carregar ou salvar os dados. Tente novamente.'
  );
}
