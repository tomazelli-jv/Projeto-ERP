// CPF é numérico e independente do CNPJ; rejeita entrada desconhecida e preserva zeros à esquerda.
export function normalizeCpf(value) {
  const candidate = String(value ?? '').trim();
  return /^[\d.-]*$/.test(candidate) ? candidate.replace(/[.-]/g, '') : null;
}
export function validateCpf(value) {
  const cpf = normalizeCpf(value);
  if (!cpf || !/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    const sum = [...cpf.slice(0, length)].reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0
    );
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(cpf[length])) return false;
  }
  return true;
}
