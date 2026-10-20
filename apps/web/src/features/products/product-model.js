import { validMoney } from '../../components/business/money.js';
import { fiscalFields, percentValid, quantityUnits } from './product-fields.js';
// Campos específicos são descartados na normalização, impedindo estoque/GTIN em serviços.
export const emptyProduct = () => ({
  type: 'PRODUCT',
  status: 'ACTIVE',
  name: '',
  code: '',
  category: '',
  groupId: '',
  description: '',
  priceCents: null,
  unit: 'UN',
  unitId: '',
  gtin: '',
  ncm: '',
  ncmId: '',
  brand: '',
  brandId: '',
  manufacturerReference: '',
  costCents: null,
  trackStock: false,
  minimumStock: '',
  durationMinutes: '',
  serviceDescription: '',
  ...Object.fromEntries(fiscalFields.map(([key]) => [key, ''])),
  maximumStock: '',
  initialStock: '',
  stockLocation: '',
  stockStoreId: '',
  allowNegativeStock: false,
  margin: '',
  promotionPriceCents: null,
  promotionStart: '',
  promotionEnd: ''
});
export function normalizeProduct(input) {
  const item = { type: input.type, status: input.status, priceCents: input.priceCents };
  for (const key of ['name', 'code', 'category', 'groupId', 'description', 'unit', 'unitId'])
    item[key] = String(input[key] ?? '').trim();
  item.unit = item.unit.toUpperCase();
  // Extensão local no mesmo registro, sem motor fiscal ou promocional.
  for (const [key] of fiscalFields) item[key] = String(input[key] ?? '').trim();
  for (const key of ['margin', 'promotionStart', 'promotionEnd']) item[key] = String(input[key] ?? '').trim();
  item.promotionPriceCents = input.promotionPriceCents ?? null;
  if (item.type === 'PRODUCT') {
    // brand preserva a descrição histórica; brandId vincula novos cadastros sem migrar dados legados.
    for (const key of ['gtin', 'ncm', 'ncmId', 'brand', 'brandId', 'manufacturerReference'])
      item[key] = String(input[key] ?? '').trim();
    item.costCents = input.costCents ?? null;
    item.trackStock = Boolean(input.trackStock);
    // Desligar controle oculta operações, mas preserva a configuração já preenchida.
    item.minimumStock = String(input.minimumStock ?? '').trim();
    for (const key of ['maximumStock', 'initialStock', 'stockLocation', 'stockStoreId'])
      item[key] = String(input[key] ?? '').trim();
    item.allowNegativeStock = Boolean(input.allowNegativeStock);
  } else {
    item.durationMinutes = String(input.durationMinutes ?? '').trim();
    item.serviceDescription = String(input.serviceDescription ?? '').trim();
  }
  return item;
}
export function validateProduct(input) {
  const item = normalizeProduct(input);
  if (!['PRODUCT', 'SERVICE'].includes(item.type)) return 'Selecione Produto ou Serviço.';
  if (!['ACTIVE', 'INACTIVE'].includes(item.status)) return 'Selecione um status válido.';
  if (!item.name) return 'Informe o nome do item.';
  if (!item.code) return 'Informe o código interno.';
  if (!validMoney(item.priceCents)) return 'Informe um preço de venda válido e não negativo.';
  if (item.type === 'PRODUCT') {
    if (!item.unit) return 'Informe a unidade de medida.';
    if (item.costCents !== null && !validMoney(item.costCents))
      return 'Informe um preço de custo válido e não negativo.';
    if (item.gtin && !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(item.gtin))
      return 'GTIN deve conter 8, 12, 13 ou 14 dígitos.';
    if (item.ncm && !/^\d{8}$/.test(item.ncm))
      return 'NCM deve conter 8 dígitos. A validação é apenas estrutural.';
    if (item.minimumStock && !/^\d+(?:[.,]\d{1,3})?$/.test(item.minimumStock))
      return 'Estoque mínimo deve ser não negativo, com até três casas decimais.';
  } else if (item.durationMinutes && !/^\d+$/.test(item.durationMinutes))
    return 'Duração deve ser um número inteiro não negativo de minutos.';
  if (item.unit && !/^[A-Z0-9]{1,10}$/.test(item.unit)) return 'Unidade deve ter até 10 letras ou números.';
  const extensionErrors = validateProductExtension(item);
  return extensionErrors ? Object.values(extensionErrors)[0] : '';
}

// Reutilizado no wizard e no repository, com mensagens associáveis aos campos.
export function validateProductExtension(item) {
  const errors = {};
  for (const [key, label, kind] of fiscalFields)
    if (kind === '%' && !percentValid(item[key]))
      errors[key] = `${label}: informe de 0 a 100, com até três casas decimais.`;
  for (const [key, size, label] of [
    ['cest', 7, 'CEST'],
    ['cfop', 4, 'CFOP']
  ])
    if (item[key] && !new RegExp(`^\\d{${size}}$`).test(item[key]))
      errors[key] = `${label} deve conter ${size} dígitos.`;
  if (item.type === 'PRODUCT') {
    for (const [key, label] of [
      ['initialStock', 'Saldo inicial'],
      ['minimumStock', 'Estoque mínimo'],
      ['maximumStock', 'Estoque máximo']
    ])
      if (item[key] && quantityUnits(item[key]) === null)
        errors[key] = `${label}: informe quantidade não negativa com até três casas decimais.`;
    if (
      item.minimumStock &&
      item.maximumStock &&
      quantityUnits(item.maximumStock) < quantityUnits(item.minimumStock)
    )
      errors.maximumStock = 'O máximo deve ser maior ou igual ao mínimo.';
    if (item.initialStock && !item.stockStoreId)
      errors.initialStock = 'Selecione uma loja no contexto antes de informar saldo inicial.';
  }
  if (!percentValid(item.margin)) errors.margin = 'Informe margem de 0 a 100.';
  if (
    item.promotionPriceCents != null &&
    (!validMoney(item.promotionPriceCents) || item.promotionPriceCents <= 0)
  )
    errors.promotionPriceCents = 'O preço promocional deve ser maior que zero.';
  for (const key of ['promotionStart', 'promotionEnd']) {
    const date = new Date(`${item[key]}T12:00:00Z`);
    if (
      item[key] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(item[key]) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== item[key])
    )
      errors[key] = 'Informe uma data válida.';
  }
  if (item.promotionStart && item.promotionEnd && item.promotionEnd < item.promotionStart)
    errors.promotionEnd = 'O fim deve ser igual ou posterior ao início.';
  return Object.keys(errors).length ? errors : null;
}
