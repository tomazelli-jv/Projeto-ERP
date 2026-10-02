import { validateCpf } from '../../components/business/cpf.js';
import { validateCnpj } from '../../components/business/business-formatters.js';
import { registrationTypes } from '../customers/customer-schema.js';
import { emptyCustomer, normalizeCustomer, states } from '../customers/customer-model.js';

// Documento/endereço/contato conservam as validações de Clientes; só os campos comerciais são específicos.
export const emptySupplier = () => ({
  ...emptyCustomer(),
  rg: '',
  registrationDate: '',
  supplierType: '',
  registrationType: 'SEM INSC',
  financial: {
    freightPercent: null,
    lastVisit: '',
    nextVisit: '',
    visitWeekDay: '',
    visitFrequencyDays: null,
    paymentTermDays: null
  },
  commercialContact: '',
  commercialEmail: '',
  commercialPhone: '',
  commercialNotes: ''
});
export const supplierTypes = ['Fabricante', 'Distribuidor'];
export const visitWeekDays = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];
// Hidratação não grava nem apaga o storage; ausência de classificação não vira um tipo fictício.
export function hydrateSupplier(input = {}) {
  const defaults = emptySupplier();
  return {
    ...defaults,
    ...input,
    tradeName: input.type === 'COMPANY' ? input.tradeName || input.name || input.legalName || '' : '',
    address: { ...defaults.address, ...input.address },
    financial: { ...defaults.financial, ...input.financial }
  };
}
export function parseFreight(value) {
  if (value === '' || value == null) return null;
  const text = String(value).replace(',', '.');
  return /^\d+(\.\d{0,2})?$/.test(text) && Number.isFinite(Number(text)) ? Number(text) : NaN;
}
const validDate = (value) =>
  !value ||
  (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value);
export function normalizeSupplier(input) {
  const data = hydrateSupplier(input);
  const supplier = { ...normalizeCustomer({ ...data, birthDate: '' }) };
  delete supplier.birthDate;
  for (const key of ['commercialContact', 'commercialEmail', 'commercialPhone', 'commercialNotes'])
    supplier[key] = String(input[key] ?? '').trim();
  supplier.commercialPhone = supplier.commercialPhone.replace(/[()\s-]/g, '');
  // Preserva inscrições PF e todos os dados comerciais já existentes, mesmo ao trocar PF/PJ.
  for (const key of [
    'rg',
    'registrationDate',
    'supplierType',
    'registrationType',
    'stateRegistration',
    'municipalRegistration',
    'contactName'
  ])
    supplier[key] = String(data[key] ?? '').trim();
  supplier.financial = { ...data.financial, freightPercent: parseFreight(data.financial.freightPercent) };
  for (const key of ['visitFrequencyDays', 'paymentTermDays'])
    supplier.financial[key] =
      data.financial[key] === '' || data.financial[key] == null ? null : Number(data.financial[key]);
  return supplier;
}
// Erros por campo compartilham o wizard; documentos e contatos usam os helpers oficiais da base.
export function supplierErrors(input, step) {
  const supplier = normalizeSupplier(input);
  const errors = {};
  // Cada etapa valida somente seus campos; a gravação final valida o cadastro inteiro.
  if (step === undefined || step === 0) {
    const nameKey = supplier.type === 'PERSON' ? 'name' : 'tradeName';
    if (!String(input[nameKey] ?? '').trim()) errors[nameKey] = 'Informe o nome.';
    if (!['PERSON', 'COMPANY'].includes(supplier.type)) errors.type = 'Selecione o tipo de fornecedor.';
    if (!['ACTIVE', 'INACTIVE'].includes(supplier.status)) errors.status = 'Selecione um status válido.';
    if (supplier.type === 'PERSON' ? !validateCpf(supplier.document) : !validateCnpj(supplier.document))
      errors.document = supplier.type === 'PERSON' ? 'CPF inválido.' : 'CNPJ inválido.';
    if (!validDate(supplier.registrationDate)) errors.registrationDate = 'Informe uma data válida.';
  }
  for (const [phase, emails, phones] of [
    [0, ['email'], ['phone', 'mobile']],
    [1, ['commercialEmail'], ['commercialPhone']]
  ]) {
    if (step !== undefined && step !== phase) continue;
    for (const key of emails)
      if (supplier[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier[key]))
        errors[key] = 'Informe um e-mail válido.';
    for (const key of phones)
      if (supplier[key] && !/^[1-9]\d{9,10}$/.test(supplier[key]))
        errors[key] = 'Informe telefone com DDD e 10 ou 11 dígitos.';
  }
  if (step === undefined || step === 1) {
    if (supplier.address.cep && !/^\d{8}$/.test(supplier.address.cep))
      errors['address.cep'] = 'Informe um CEP com 8 dígitos.';
    if (supplier.address.state && !states.includes(supplier.address.state))
      errors['address.state'] = 'Selecione uma UF válida.';
    if (supplier.supplierType && !supplierTypes.includes(supplier.supplierType))
      errors.supplierType = 'Selecione Fabricante ou Distribuidor.';
  }
  if (step === undefined || step === 2) {
    if (!registrationTypes.includes(supplier.registrationType))
      errors.registrationType = 'Selecione o tipo de inscrição.';
    if (supplier.registrationType === 'COM INSC' && !supplier.stateRegistration)
      errors.stateRegistration = 'Informe a inscrição estadual.';
  }
  if (step === undefined || step === 3) {
    const f = supplier.financial;
    if (f.freightPercent !== null && (!Number.isFinite(f.freightPercent) || f.freightPercent < 0))
      errors.freightPercent = 'Informe um percentual não negativo, com até duas casas decimais.';
    for (const key of ['lastVisit', 'nextVisit'])
      if (!validDate(f[key])) errors[key] = 'Informe uma data válida.';
    if (f.visitWeekDay && !visitWeekDays.includes(f.visitWeekDay))
      errors.visitWeekDay = 'Selecione um dia da semana.';
    for (const key of ['visitFrequencyDays', 'paymentTermDays'])
      if (f[key] !== null && (!Number.isSafeInteger(f[key]) || f[key] <= 0))
        errors[key] = 'Informe um número inteiro positivo de dias.';
  }
  return errors;
}
export const validateSupplier = (input) => Object.values(supplierErrors(input))[0] || '';
