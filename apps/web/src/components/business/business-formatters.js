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
  // Separadores dependem da posição lógica, inclusive durante digitação e exclusão parcial.
  return (
    normalized.slice(0, 2) +
    (normalized.length > 2 ? `.${normalized.slice(2, 5)}` : '') +
    (normalized.length > 5 ? `.${normalized.slice(5, 8)}` : '') +
    (normalized.length > 8 ? `/${normalized.slice(8, 12)}` : '') +
    (normalized.length > 12 ? `-${normalized.slice(12)}` : '')
  );
}

// O cálculo alfanumérico usa ASCII menos 48 e módulo 11; o backend atual ainda requer adequação.
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
  if (!value) return 'Não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR').format(date);
}

// CPF aceita somente 11 digitos, preservando zeros e separadores progressivos.
export function formatCpf(value) {
  const digits = onlyDigits(value, 11);
  return (
    digits.slice(0, 3) +
    (digits.length > 3 ? '.' + digits.slice(3, 6) : '') +
    (digits.length > 6 ? '.' + digits.slice(6, 9) : '') +
    (digits.length > 9 ? '-' + digits.slice(9) : '')
  );
}
