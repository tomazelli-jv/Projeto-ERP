export function normalizeDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeCnpj(value) {
  return normalizeDigits(value);
}

export function hasOnlyDigits(value) {
  return /^\d+$/.test(String(value ?? ''));
}

function calculateDigit(base, weights) {
  const total = weights.reduce((sum, weight, index) => sum + Number(base[index]) * weight, 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const firstDigit = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(
    `${cnpj.slice(0, 12)}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );
  return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}
