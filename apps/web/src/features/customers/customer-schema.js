import { emptyCustomer, normalizeCustomer, states } from './customer-model.js';
import { validateCpf } from '../../components/business/cpf.js';
import { validateCnpj } from '../../components/business/business-formatters.js';
import { validMoney } from '../../components/business/money.js';

export const registrationTypes = ['COM INSC', 'SEM INSC', 'ISENTO'];
export const taxpayerTypes = {
  1: '1 - Contribuinte de ICMS',
  2: '2 - Contribuinte de ICMS isento de inscrição',
  9: '9 - Não Contribuinte de ICMS'
};
// Defaults são aplicados na leitura, sem apagar registros antigos nem inventar RG/endereço.
// Limite de crédito é armazenado em centavos, como os demais valores monetários do ERP.
export function hydrateCustomer(input = {}) {
  const base = emptyCustomer();
  return {
    ...base,
    rg: '',
    registrationDate: '',
    registrationType: 'SEM INSC',
    taxpayerType: '1',
    ...input,
    tradeName: input.type === 'COMPANY' ? input.tradeName || input.name || input.legalName || '' : '',
    address: { ...base.address, ...input.address },
    financial: { allowReceivables: false, creditLimit: 0, ...input.financial }
  };
}
export function normalizeCustomerRecord(input) {
  const c = hydrateCustomer(input);
  return {
    ...normalizeCustomer(c),
    rg: c.type === 'PERSON' ? c.rg.trim() : '',
    registrationDate: c.type === 'COMPANY' ? c.registrationDate : '',
    registrationType: c.registrationType,
    taxpayerType: c.taxpayerType,
    stateRegistration: c.stateRegistration.trim(),
    municipalRegistration: c.municipalRegistration.trim(),
    financial: { ...c.financial }
  };
}
const validDate = (value) =>
  !value ||
  (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10));
// Erros por campo atendem o wizard e o repository; validação de escrita não impede ler mocks legados.
export function customerErrors(input, step) {
  const c = hydrateCustomer(input);
  const errors = {};
  const required = (key, value) => {
    if (!String(value ?? '').trim()) errors[key] = 'Campo obrigatório.';
  };
  if (step === undefined || step === 0) {
    required(c.type === 'PERSON' ? 'name' : 'tradeName', c.type === 'PERSON' ? c.name : input.tradeName);
    if (!['PERSON', 'COMPANY'].includes(c.type)) errors.type = 'Tipo inválido.';
    if (!['ACTIVE', 'INACTIVE'].includes(c.status)) errors.status = 'Status inválido.';
    if (!(c.type === 'PERSON' ? validateCpf(c.document) : validateCnpj(c.document)))
      errors.document = 'Informe um documento válido.';
    if (c.type === 'PERSON') required('rg', c.rg);
    for (const key of ['street', 'neighborhood', 'city', 'state']) required(`address.${key}`, c.address[key]);
    if (!states.includes(c.address.state)) errors['address.state'] = 'Selecione uma UF válida.';
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()))
      errors.email = 'Informe um e-mail válido.';
    for (const key of ['phone', 'mobile'])
      if (c[key] && !/^[1-9]\d{9,10}$/.test(c[key].replace(/[()\s-]/g, '')))
        errors[key] = 'Informe DDD e 10 ou 11 dígitos.';
    if (c.address.cep && !/^\d{8}$/.test(c.address.cep.replace(/-/g, '')))
      errors['address.cep'] = 'Informe 8 dígitos.';
    const date = c.type === 'PERSON' ? 'birthDate' : 'registrationDate';
    if (!validDate(c[date])) errors[date] = 'Informe uma data válida, não futura.';
  }
  // Inscricoes sao validadas somente na etapa Fiscal e na gravacao final.
  if (step === undefined || step === 1) {
    if (!registrationTypes.includes(c.registrationType))
      errors.registrationType = 'Selecione o tipo de inscrição.';
    if (c.registrationType !== 'SEM INSC') {
      required('stateRegistration', c.stateRegistration);
      required('municipalRegistration', c.municipalRegistration);
    }
  }
  if ((step === undefined || step === 1) && !Object.hasOwn(taxpayerTypes, c.taxpayerType))
    errors.taxpayerType = 'Selecione o tipo de contribuinte.';
  if (step === undefined || step === 2) {
    if (!validMoney(c.financial.creditLimit))
      errors.creditLimit = 'Informe um limite válido, maior ou igual a zero.';
    if (typeof c.financial.allowReceivables !== 'boolean') errors.allowReceivables = 'Preferência inválida.';
  }
  return errors;
}
export const validateCustomerRecord = (input) => Object.values(customerErrors(input))[0] || '';
