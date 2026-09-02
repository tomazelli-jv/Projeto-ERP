// Máscaras são apenas visuais; a API sempre recebe CNPJ e CEP contendo somente dígitos.
export function onlyDigits(value, maximum) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maximum);
}

// CNPJ é progressivo para funcionar durante a digitação e não apenas com 14 dígitos completos.
export function formatCnpj(value) {
  return onlyDigits(value, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
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
