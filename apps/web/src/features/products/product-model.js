import { validMoney } from '../../components/business/money.js';
// Campos específicos são descartados na normalização, impedindo estoque/GTIN em serviços.
export const emptyProduct = () => ({
  type: 'PRODUCT',
  status: 'ACTIVE',
  name: '',
  code: '',
  category: '',
  description: '',
  priceCents: null,
  unit: 'UN',
  gtin: '',
  ncm: '',
  brand: '',
  manufacturerReference: '',
  costCents: null,
  trackStock: false,
  minimumStock: '',
  durationMinutes: '',
  serviceDescription: ''
});
export function normalizeProduct(input) {
  const item = { type: input.type, status: input.status, priceCents: input.priceCents };
  for (const key of ['name', 'code', 'category', 'description', 'unit'])
    item[key] = String(input[key] ?? '').trim();
  item.unit = item.unit.toUpperCase();
  if (item.type === 'PRODUCT') {
    for (const key of ['gtin', 'ncm', 'brand', 'manufacturerReference'])
      item[key] = String(input[key] ?? '').trim();
    item.costCents = input.costCents ?? null;
    item.trackStock = Boolean(input.trackStock);
    item.minimumStock = item.trackStock ? String(input.minimumStock ?? '').trim() : '';
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
  return '';
}
