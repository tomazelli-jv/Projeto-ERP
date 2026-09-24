import {
  normalizeCnpj,
  validateCnpj,
  formatCpf,
  formatCnpj
} from '../../components/business/business-formatters.js';
import { normalizeCpf, validateCpf } from '../../components/business/cpf.js';

// Modelo de formulário compartilhado por criação, edição e repository; campos do outro tipo são descartados.
export const states =
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
export const customerName = (customer) =>
  customer.type === 'PERSON' ? customer.name : customer.tradeName || customer.legalName;
export const typeLabel = (type) => (type === 'PERSON' ? 'Pessoa Física' : 'Pessoa Jurídica');
export const customerDocument = (customer) =>
  customer.type === 'PERSON' ? formatCpf(customer.document) : formatCnpj(customer.document);
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
export const emptyCustomer = () => ({
  type: 'PERSON',
  status: 'ACTIVE',
  name: '',
  legalName: '',
  tradeName: '',
  document: '',
  birthDate: '',
  stateRegistration: '',
  municipalRegistration: '',
  contactName: '',
  email: '',
  phone: '',
  mobile: '',
  address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
  notes: ''
});
export function normalizeCustomer(input) {
  const result = emptyCustomer();
  for (const field of Object.keys(result))
    if (field !== 'address') result[field] = String(input[field] ?? '').trim();
  for (const field of Object.keys(result.address))
    result.address[field] = String(input.address?.[field] ?? '').trim();
  result.document = result.type === 'PERSON' ? normalizeCpf(result.document) : normalizeCnpj(result.document);
  for (const key of ['phone', 'mobile']) result[key] = result[key].replace(/[()\s-]/g, '');
  result.address.cep = result.address.cep.replace(/-/g, '');
  result.address.state = result.address.state.toUpperCase();
  for (const field of result.type === 'PERSON'
    ? ['legalName', 'tradeName', 'stateRegistration', 'municipalRegistration', 'contactName']
    : ['name', 'birthDate'])
    result[field] = '';
  return result;
}
export function validateCustomer(input) {
  const c = normalizeCustomer(input);
  if (!['PERSON', 'COMPANY'].includes(c.type)) return 'Selecione o tipo de cliente.';
  if (!['ACTIVE', 'INACTIVE'].includes(c.status)) return 'Selecione um status válido.';
  if (c.type === 'PERSON' && !c.name) return 'Informe o nome completo.';
  if (c.type === 'COMPANY' && !c.legalName) return 'Informe a razão social.';
  if (c.type === 'PERSON' ? !validateCpf(c.document) : !validateCnpj(c.document))
    return c.type === 'PERSON'
      ? 'CPF inválido. Confira os dígitos verificadores.'
      : 'CNPJ inválido. Confira os caracteres e dígitos verificadores.';
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return 'Informe um e-mail válido.';
  for (const key of ['phone', 'mobile'])
    if (c[key] && !/^[1-9]\d{9,10}$/.test(c[key]))
      return 'Informe telefone e celular com DDD e 10 ou 11 dígitos.';
  if (c.address.cep && !/^\d{8}$/.test(c.address.cep)) return 'Informe um CEP com 8 dígitos.';
  if (c.address.state && !states.includes(c.address.state)) return 'Selecione uma UF válida.';
  if (
    c.birthDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(c.birthDate) ||
      Number.isNaN(Date.parse(c.birthDate)) ||
      new Date(c.birthDate).toISOString().slice(0, 10) !== c.birthDate ||
      c.birthDate > new Date().toISOString().slice(0, 10))
  )
    return 'Informe uma data de nascimento válida, não futura.';
  return '';
}
