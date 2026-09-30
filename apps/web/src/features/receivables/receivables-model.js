import { formatDate } from '../../components/business/business-formatters.js';
import { validMoney, formatMoney } from '../../components/business/money.js';
import { customerName } from '../customers/customer-model.js';

// Datas civis são comparadas sem UTC/local implícito; dinheiro permanece em centavos inteiros.
// Vencimentos não são timestamps: meio-dia local evita recuar um dia ao formatar ISO civil.
export const formatReceivableDate = (value) => formatDate(value ? `${value}T12:00:00` : value);
// Totais podem exceder o teto de um campo individual; BigInt evita arredondar centavos na apresentação.
export function formatReceivableMoney(value) {
  if (validMoney(value)) return formatMoney(value);
  if (!Number.isSafeInteger(value) || value < 0) return '—';
  const cents = BigInt(value);
  return (
    'R$ ' + new Intl.NumberFormat('pt-BR').format(cents / 100n) + ',' + String(cents % 100n).padStart(2, '0')
  );
}
export const todayDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const validDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function monthPeriod(today = todayDate()) {
  const [year, month] = today.split('-').map(Number);
  return {
    receivedFrom: `${today.slice(0, 7)}-01`,
    receivedTo: `${today.slice(0, 7)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`
  };
}
export function installmentDate(first, index) {
  if (!validDate(first) || !Number.isSafeInteger(index) || index < 0) throw Error('Vencimento inválido.');
  const [year, month, day] = first.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + index, 1));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 9999)
    throw Error('Parcelamento excede o intervalo de datas suportado.');
  return date.toISOString().slice(0, 10);
}
export function installmentAt(total, count, first, index) {
  const base = Math.floor(total / count);
  return {
    installmentNumber: index + 1,
    installmentCount: count,
    dueDate: installmentDate(first, index),
    originalAmountCents: index === count - 1 ? total - base * (count - 1) : base
  };
}
export function validateInstallments(total, count, first) {
  if (!validMoney(total) || total <= 0) throw Error('Informe um valor total maior que zero.');
  if (!Number.isSafeInteger(count) || count < 1)
    throw Error('Informe um número inteiro de parcelas maior ou igual a 1.');
  // Não há teto comercial: cada parcela precisa representar ao menos um centavo e uma data válida.
  if (count > total) throw Error('Cada parcela deve possuir pelo menos um centavo.');
  installmentDate(first, count - 1);
}
export function splitInstallments(total, count, first) {
  validateInstallments(total, count, first);
  return Array.from({ length: count }, (_, index) => installmentAt(total, count, first, index));
}
export function sumCents(values) {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < 0n)
    throw Error('Total fora do intervalo monetário suportado.');
  return Number(total);
}
export const balanceCents = (title, payments) =>
  title.originalAmountCents - sumCents(payments.map((p) => p.amountAppliedCents));
export const statusLabels = {
  OPEN: 'Em aberto',
  PARTIAL: 'Parcial',
  OVERDUE: 'Vencido',
  PAID: 'Recebido',
  CANCELED: 'Cancelado'
};
export function titleStatus(title, payments, today = todayDate()) {
  if (title.canceledAt) return 'CANCELED';
  const balance = balanceCents(title, payments);
  if (balance === 0) return 'PAID';
  if (title.dueDate < today) return 'OVERDUE';
  return balance < title.originalAmountCents ? 'PARTIAL' : 'OPEN';
}
export const eligibleCustomer = (customer) =>
  customer?.status === 'ACTIVE' && customer.financial?.allowReceivables === true;
export function paymentTotal(data) {
  const keys = ['amountAppliedCents', 'discountCents', 'interestCents', 'penaltyCents'];
  if (keys.some((key) => !validMoney(data[key])))
    throw Error('Informe valores monetários não negativos válidos.');
  return sumCents([data.amountAppliedCents, data.interestCents, data.penaltyCents]) - data.discountCents;
}
export function validatePayment(data, balance) {
  if (!validDate(data.receivedAt)) throw Error('Informe a data do recebimento.');
  const total = paymentTotal(data);
  if (data.amountAppliedCents <= 0 || data.amountAppliedCents > balance)
    throw Error('Valor da baixa deve ser maior que zero e não superar o saldo atual.');
  if (total < 0) throw Error('Desconto não pode tornar o total recebido negativo.');
  if (!data.paymentMethodId) throw Error('Selecione a forma de pagamento.');
  return total;
}
const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export const searchText = (value) => fold(value).replace(/[.\s/()-]/g, '');
export function filterTitles(rows, filters = {}) {
  const search = searchText(filters.search);
  return rows.filter(
    (row) =>
      (!filters.customerId || row.customerId === filters.customerId) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.dueFrom || row.dueDate >= filters.dueFrom) &&
      (!filters.dueTo || row.dueDate <= filters.dueTo) &&
      (!search ||
        (filters.searchField === 'name'
          ? [row.customer ? customerName(row.customer) : '']
          : filters.searchField === 'document'
            ? [row.document, row.customer?.document]
            : filters.searchField === 'description'
              ? [row.description]
              : [
                  row.customer ? customerName(row.customer) : '',
                  row.customer?.document,
                  row.document,
                  row.description
                ]
        ).some((v) => searchText(v).includes(search)))
  );
}
// Cards de saldo acompanham os filtros da lista. Recebidos usa data da baixa, não vencimento/status.
export function financialSummary(rows, payments, filters = {}, today = todayDate()) {
  const filtered = filterTitles(rows, filters);
  const outstanding = filtered.filter((row) => !['CANCELED', 'PAID'].includes(row.status));
  const due = outstanding.filter((row) => row.dueDate >= today);
  const overdue = outstanding.filter((row) => row.dueDate < today);
  const initialPeriod = monthPeriod(today);
  const period = {
    receivedFrom: filters.receivedFrom || initialPeriod.receivedFrom,
    receivedTo: filters.receivedTo || initialPeriod.receivedTo
  };
  const ids = new Set(
    filterTitles(rows, {
      customerId: filters.customerId,
      search: filters.search,
      searchField: filters.searchField
    }).map((row) => row.id)
  );
  const received = payments.filter(
    (p) => ids.has(p.receivableId) && p.receivedAt >= period.receivedFrom && p.receivedAt <= period.receivedTo
  );
  const card = (items) => ({ amount: sumCents(items.map((row) => row.balanceCents)), count: items.length });
  return {
    due: card(due),
    overdue: card(overdue),
    outstanding: card(outstanding),
    received: { amount: sumCents(received.map((p) => p.totalReceivedCents)), count: received.length }
  };
}

// Ordena a coleção completa antes da paginação, preservando desempate estável por id.
export function compareTitles(a, b, filters = {}) {
  const key = filters.sortBy || 'dueDate';
  const value = (row) =>
    key === 'customer'
      ? row.customer
        ? customerName(row.customer)
        : ''
      : key === 'status'
        ? statusLabels[row.status]
        : row[key];
  const av = value(a),
    bv = value(b);
  const comparison =
    typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR', { numeric: true });
  return comparison * (filters.sortDirection === 'desc' ? -1 : 1) || a.id.localeCompare(b.id);
}
