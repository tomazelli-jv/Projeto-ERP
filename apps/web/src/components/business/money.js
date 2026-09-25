// Valores monetários persistidos em centavos inteiros; conversão decimal só na apresentação.
export const MAX_MONEY_CENTS = 999999999999;
export function parseMoney(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/^R\$\s*/, '');
  if (!text) return null;
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{0,2})?$/.test(text)) return NaN;
  const [integer, fraction = ''] = text.replace(/\./g, '').split(',');
  const cents = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
  return cents <= BigInt(MAX_MONEY_CENTS) ? Number(cents) : NaN;
}
export const validMoney = (value) => Number.isSafeInteger(value) && value >= 0 && value <= MAX_MONEY_CENTS;
export const formatMoney = (value) =>
  validMoney(value)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
    : '—';
export const moneyInput = (value) =>
  validMoney(value) ? `${Math.floor(value / 100)},${String(value % 100).padStart(2, '0')}` : '';
