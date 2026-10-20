import { validMoney } from '../../components/business/money.js';
import {
  balanceCents,
  eligibleCustomer,
  filterTitles,
  compareTitles,
  financialSummary,
  installmentDate,
  paymentTotal,
  splitInstallments,
  titleStatus,
  todayDate,
  validDate,
  validatePayment
} from './receivables-model.js';
import { paymentMethodsRepository } from './paymentMethodsRepository.js';

// Um envelope grava títulos, baixas e eventos atomicamente. Nunca apaga dados inválidos automaticamente.
// O lock injetado pelos hooks serializa operações entre abas, incluindo a checagem do saldo mais recente.
export function createMockReceivablesRepository({
  storage,
  key = 'erp.dev.receivables.v1',
  customers,
  methods = paymentMethodsRepository,
  now = () => new Date(),
  id = () => crypto.randomUUID(),
  lock = (_name, operation) => operation(),
  seed = true
} = {}) {
  let memory;
  let queue = Promise.resolve();
  const timestamp = () => now().toISOString();
  async function customerList() {
    const first = await customers.list({ page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; rows.length < first.total; page++) {
      const next = await customers.list({ page, pageSize: 100 });
      if (!next.items.length) break;
      rows.push(...next.items);
    }
    return rows;
  }
  function write(data) {
    try {
      storage?.setItem(key, JSON.stringify(data));
    } catch {
      throw Error(
        'Não foi possível salvar no armazenamento local. Verifique o espaço e as permissões do navegador.'
      );
    }
    memory = structuredClone(data);
  }
  async function read() {
    let saved;
    try {
      saved = storage?.getItem(key);
    } catch {
      throw Error('Não foi possível ler as contas a receber de demonstração.');
    }
    if (saved != null || memory) {
      try {
        const data = saved != null ? JSON.parse(saved) : structuredClone(memory);
        if (
          data.version !== 1 ||
          !Array.isArray(data.titles) ||
          !Array.isArray(data.payments) ||
          !Array.isArray(data.history)
        )
          throw Error();
        if (
          data.titles.some(
            (t) =>
              !t.id ||
              !t.customerId ||
              !validDate(t.dueDate) ||
              !validDate(t.issueDate) ||
              !validMoney(t.originalAmountCents) ||
              t.originalAmountCents <= 0
          )
        )
          throw Error();
        if (new Set(data.titles.map((t) => t.id)).size !== data.titles.length) throw Error();
        if (
          data.payments.some(
            (p) =>
              !data.titles.some((t) => t.id === p.receivableId) ||
              !validDate(p.receivedAt) ||
              p.amountAppliedCents <= 0 ||
              paymentTotal(p) !== p.totalReceivedCents ||
              p.totalReceivedCents < 0
          )
        )
          throw Error();
        if (
          data.titles.some(
            (t) =>
              balanceCents(
                t,
                data.payments.filter((p) => p.receivableId === t.id)
              ) < 0
          )
        )
          throw Error();
        return data;
      } catch {
        throw Error('Dados de Contas a Receber inválidos neste navegador. Nenhum registro foi apagado.');
      }
    }
    const data = { version: 1, titles: [], payments: [], history: [] };
    // Demo relaciona somente fixtures já existentes em Clientes, sem criar/habilitar clientes silenciosamente.
    const customer = seed && (await customerList()).find((c) => c.id === 'demo-pf-1');
    if (customer) {
      const today = todayDate(now());
      const past = new Date(now());
      past.setDate(past.getDate() - 5);
      for (const [index, status] of ['OPEN', 'PARTIAL', 'OVERDUE', 'PAID', 'CANCELED'].entries()) {
        const title = {
          id: `demo-receivable-${index}`,
          groupId: `demo-group-${index}`,
          customerId: customer.id,
          description: `Demonstração — título ${index + 1}`,
          document: `DEMO-${index + 1}`,
          installmentNumber: 1,
          installmentCount: 1,
          issueDate: todayDate(past),
          dueDate: status === 'OVERDUE' ? todayDate(past) : installmentDate(today, 1),
          originalAmountCents: 10000,
          origin: 'MANUAL',
          canceledAt: status === 'CANCELED' ? timestamp() : null,
          notes: 'Registro fictício de demonstração local.',
          createdAt: timestamp(),
          updatedAt: timestamp()
        };
        data.titles.push(title);
        if (['PARTIAL', 'PAID'].includes(status)) {
          const amount = status === 'PAID' ? 10000 : 3000;
          data.payments.push({
            id: `demo-payment-${index}`,
            receivableId: title.id,
            receivedAt: today,
            amountAppliedCents: amount,
            discountCents: 0,
            interestCents: 0,
            penaltyCents: 0,
            totalReceivedCents: amount,
            paymentMethodId: 'cash',
            notes: 'Baixa fictícia de demonstração.',
            createdAt: timestamp()
          });
        }
      }
    }
    write(data);
    return data;
  }
  const exclusive = (operation) => {
    const run = queue.then(() => lock(key, operation));
    queue = run.catch(() => {});
    return run;
  };
  const find = (data, titleId) => {
    const title = data.titles.find((t) => t.id === titleId);
    if (!title) throw Error('Título não encontrado.');
    return title;
  };
  const paymentsFor = (data, titleId) => data.payments.filter((p) => p.receivableId === titleId);
  const event = (data, titleId, action) =>
    data.history.push({ id: id(), receivableId: titleId, action, createdAt: timestamp() });
  async function rows(data) {
    const people = new Map((await customerList()).map((c) => [c.id, c]));
    return data.titles.map((t) => ({
      ...t,
      customer: people.get(t.customerId) ?? null,
      balanceCents: balanceCents(t, paymentsFor(data, t.id)),
      status: titleStatus(t, paymentsFor(data, t.id), todayDate(now())),
      paymentCount: paymentsFor(data, t.id).length
    }));
  }
  async function checkCustomer(customerId) {
    if (!eligibleCustomer(await customers.getById(customerId)))
      throw Error('Selecione um cliente ativo e habilitado para Contas a Receber.');
  }
  function titleInput(input) {
    if (!input.customerId) throw Error('Selecione o cliente.');
    if (!String(input.description ?? '').trim()) throw Error('Informe a descrição.');
    if (!validDate(input.issueDate) || !validDate(input.dueDate))
      throw Error('Informe emissão e vencimento válidos.');
    if (!validMoney(input.originalAmountCents) || input.originalAmountCents <= 0)
      throw Error('Informe um valor maior que zero.');
    return {
      customerId: input.customerId,
      description: String(input.description).trim(),
      document: String(input.document ?? '').trim(),
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      originalAmountCents: input.originalAmountCents,
      notes: String(input.notes ?? '').trim()
    };
  }
  const createInstallments = (input) =>
    exclusive(async () => {
      const parcels = splitInstallments(input.totalCents, input.installmentCount, input.dueDate);
      const values = titleInput({ ...input, originalAmountCents: input.totalCents });
      await checkCustomer(values.customerId);
      const data = await read();
      const groupId = id();
      const titles = parcels.map((part) => ({
        ...values,
        ...part,
        id: id(),
        groupId,
        origin: 'MANUAL',
        canceledAt: null,
        createdAt: timestamp(),
        updatedAt: timestamp()
      }));
      data.titles.push(...titles);
      for (const title of titles) event(data, title.id, 'Título criado');
      write(data);
      return structuredClone(titles);
    });
  return {
    list: (filters = {}) =>
      exclusive(async () => {
        const items = filterTitles(await rows(await read()), filters).sort((a, b) =>
          compareTitles(a, b, filters)
        );
        const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));
        const page = Math.min(
          Math.max(1, Number(filters.page) || 1),
          Math.max(1, Math.ceil(items.length / pageSize))
        );
        return {
          items: items.slice((page - 1) * pageSize, page * pageSize),
          total: items.length,
          page,
          pageSize
        };
      }),
    getById: (titleId) =>
      exclusive(async () => {
        const data = await read();
        const title = (await rows(data)).find((t) => t.id === titleId);
        return title
          ? {
              ...title,
              payments: paymentsFor(data, titleId),
              history: data.history.filter((h) => h.receivableId === titleId)
            }
          : null;
      }),
    getSummary: (filters) =>
      exclusive(async () => {
        const data = await read();
        return financialSummary(await rows(data), data.payments, filters, todayDate(now()));
      }),
    listPayments: (titleId) => exclusive(async () => paymentsFor(await read(), titleId)),
    createInstallments,
    create: (input) => createInstallments({ ...input, installmentCount: 1 }),
    update: (titleId, input) =>
      exclusive(async () => {
        const data = await read();
        const title = find(data, titleId);
        if (title.canceledAt) throw Error('Título cancelado não pode ser editado.');
        const values = titleInput(input);
        if (paymentsFor(data, titleId).length) {
          if (
            values.customerId !== title.customerId ||
            values.originalAmountCents !== title.originalAmountCents ||
            values.issueDate !== title.issueDate
          )
            throw Error('Título com recebimentos não permite alterar cliente, emissão ou valor original.');
        } else if (values.customerId !== title.customerId) await checkCustomer(values.customerId);
        Object.assign(title, values, { updatedAt: timestamp() });
        event(data, titleId, 'Título editado');
        write(data);
        return structuredClone(title);
      }),
    cancel: (titleId) =>
      exclusive(async () => {
        const data = await read();
        const title = find(data, titleId);
        if (paymentsFor(data, titleId).length)
          throw Error('Este título possui recebimentos registrados e não pode ser cancelado sem estorno.');
        if (title.canceledAt) throw Error('Título já cancelado.');
        title.canceledAt = timestamp();
        title.updatedAt = timestamp();
        event(data, titleId, 'Título cancelado');
        write(data);
        return structuredClone(title);
      }),
    receive: (titleId, input) =>
      exclusive(async () => {
        const data = await read();
        const title = find(data, titleId);
        if (title.canceledAt) throw Error('Título cancelado não pode receber baixa.');
        const total = validatePayment(input, balanceCents(title, paymentsFor(data, titleId)));
        if (!(await methods.list()).some((m) => m.id === input.paymentMethodId))
          throw Error('Forma de pagamento inválida.');
        const payment = {
          id: id(),
          receivableId: titleId,
          receivedAt: input.receivedAt,
          amountAppliedCents: input.amountAppliedCents,
          discountCents: input.discountCents,
          interestCents: input.interestCents,
          penaltyCents: input.penaltyCents,
          totalReceivedCents: total,
          paymentMethodId: input.paymentMethodId,
          notes: String(input.notes ?? '').trim(),
          createdAt: timestamp()
        };
        data.payments.push(payment);
        title.updatedAt = timestamp();
        event(data, titleId, 'Recebimento registrado');
        write(data);
        return structuredClone(payment);
      })
  };
}
