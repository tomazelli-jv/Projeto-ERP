// Campos realmente numéricos continuam usando esta função; CNPJ possui normalização própria para preservar letras.
export function onlyDigits(value, maximum) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maximum);
}

// A representação lógica aceita somente caracteres oficiais e remove apenas a pontuação visual conhecida.
export function normalizeCnpj(value) {
  const candidate = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9./-]*$/.test(candidate)) return null;
  return candidate.replace(/[./-]/g, '');
}

// A máscara opera sobre as 14 posições lógicas e mantém letras nas doze primeiras posições.
export function formatCnpj(value) {
  const normalized = normalizeCnpj(value);
  if (normalized === null)
    return String(value ?? '')
      .trim()
      .toUpperCase();
  // Excesso permanece visível para validação, evitando truncar e aceitar silenciosamente outro documento.
  if (normalized.length > 14) return normalized;
  return normalized
    .replace(/^(.{2})(.)/, '$1.$2')
    .replace(/^(..\....)(.)/, '$1.$2')
    .replace(/^(..\....\....)(.)/, '$1/$2')
    .replace(/(.{4})(.{1,2})$/, '$1-$2');
}

// O cálculo usa ASCII menos 48 e módulo 11, compartilhando o mesmo algoritmo oficial aplicado pelo backend.
export function validateCnpj(value) {
  const document = normalizeCnpj(value);
  if (!document || !/^[A-Z0-9]{12}[0-9]{2}$/.test(document) || new Set(document).size === 1) return false;
  const calculate = (characters, weights) => {
    const sum = [...characters].reduce(
      (total, character, index) => total + (character.charCodeAt(0) - 48) * weights[index],
      0
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(document.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculate(`${document.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return document.endsWith(`${first}${second}`);
}

// CEP mantém a entrada legível, enquanto sua normalização é feita no submit.
export function formatCep(value) {
  return onlyDigits(value, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

// Telefone aceita dez ou onze dígitos brasileiros e evita ultrapassar o limite do backend.
export function formatPhone(value) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

// Datas inválidas não quebram a página e são apresentadas como informação indisponível.
export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR').format(date);
}
