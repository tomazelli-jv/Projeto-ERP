import { parseMoney, validMoney, MAX_MONEY_CENTS } from '../../components/business/money.js';

// Percentuais usam centésimos de ponto percentual e BigInt; arredondamento half-up
// ocorre somente no preço final, evitando multiplicação monetária com float.
export function parseAdjustment(value, mode) {
  const text = String(value ?? '').trim();
  const negative = text.startsWith('-');
  const unsigned = text.replace(/^[+-]/, '');
  if (!unsigned) throw Error('Informe o valor do ajuste.');
  const amount = parseMoney(unsigned);
  if (!validMoney(amount) || !['PERCENT', 'VALUE', 'FIXED'].includes(mode))
    throw Error('Informe um valor válido, com até duas casas decimais (vírgula).');
  return negative ? -amount : amount;
}
export const validNewPrice = (value) => validMoney(value) && value > 0;

export function calculatePrice(previousPriceCents, mode, adjustment) {
  if (!validMoney(previousPriceCents) || !Number.isSafeInteger(adjustment))
    throw Error('Preço ou ajuste inválido.');
  const old = BigInt(previousPriceCents);
  const delta = BigInt(adjustment);
  let result;
  if (mode === 'PERCENT') {
    const numerator = old * (10000n + delta);
    result = numerator >= 0n ? (numerator + 5000n) / 10000n : -((-numerator + 5000n) / 10000n);
  } else if (mode === 'VALUE') result = old + delta;
  else if (mode === 'FIXED') result = delta;
  else throw Error('Selecione um tipo de ajuste válido.');
  return result < -BigInt(MAX_MONEY_CENTS) || result > BigInt(MAX_MONEY_CENTS) ? NaN : Number(result);
}

export function buildPricePreview(products, mode, value) {
  if (!products.length) throw Error('Selecione pelo menos um produto.');
  const adjustment = parseAdjustment(value, mode);
  return products.map((product) => {
    if (product.type !== 'PRODUCT' || product.status !== 'ACTIVE')
      throw Error('Somente produtos ativos podem ser remarcados. Atualize a seleção.');
    return {
      productId: product.id,
      name: product.name,
      previousPriceCents: product.priceCents,
      newPriceCents: calculatePrice(product.priceCents, mode, adjustment),
      manual: false
    };
  });
}

export function priceChangeLabel(previous, next) {
  if (!validNewPrice(next)) return 'Preço inválido';
  if (previous === next) return 'Sem alteração';
  if (!previous) return 'Novo preço (anterior zero)';
  const delta = BigInt(next) - BigInt(previous);
  const absolute = delta < 0n ? -delta : delta;
  const basisPoints = (absolute * 10000n + BigInt(previous) / 2n) / BigInt(previous);
  return `${delta < 0n ? '-' : '+'}${basisPoints / 100n},${String(basisPoints % 100n).padStart(2, '0')}%`;
}

export function summarizePreview(rows) {
  return {
    selected: rows.length,
    changed: rows.filter((r) => validNewPrice(r.newPriceCents) && r.newPriceCents !== r.previousPriceCents)
      .length,
    unchanged: rows.filter((r) => validNewPrice(r.newPriceCents) && r.newPriceCents === r.previousPriceCents)
      .length,
    increases: rows.filter((r) => validNewPrice(r.newPriceCents) && r.newPriceCents > r.previousPriceCents)
      .length,
    reductions: rows.filter((r) => validNewPrice(r.newPriceCents) && r.newPriceCents < r.previousPriceCents)
      .length,
    invalid: rows.filter((r) => !validNewPrice(r.newPriceCents)).length
  };
}
