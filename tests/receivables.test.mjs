import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatReceivableDate,
  formatReceivableMoney
} from '../apps/web/src/features/receivables/receivables-model.js';
import {
  splitInstallments,
  installmentDate,
  titleStatus,
  balanceCents,
  paymentTotal,
  financialSummary
} from '../apps/web/src/features/receivables/receivables-model.js';
import { createMockReceivablesRepository } from '../apps/web/src/features/receivables/mockReceivablesRepository.js';
import { createMockCustomersRepository } from '../apps/web/src/features/customers/mockCustomersRepository.js';

// Repository de Clientes real; apenas storage/relógio são injetados para determinismo e isolamento.
function setup() {
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value)
  };
  const people = [
    {
      id: 'enabled',
      type: 'PERSON',
      name: 'Cliente teste',
      document: '52998224725',
      status: 'ACTIVE',
      financial: { allowReceivables: true },
      address: {}
    },
    {
      id: 'inactive',
      type: 'PERSON',
      name: 'Inativo',
      document: '11144477735',
      status: 'INACTIVE',
      financial: { allowReceivables: true },
      address: {}
    },
    {
      id: 'disabled',
      type: 'COMPANY',
      tradeName: 'Desabilitado',
      document: '12ABC34501DE35',
      status: 'ACTIVE',
      financial: { allowReceivables: false },
      address: {}
    }
  ];
  storage.setItem('customers', JSON.stringify(people));
  const customers = createMockCustomersRepository({ storage, key: 'customers' });
  let serial = 0;
  const options = {
    storage,
    customers,
    seed: false,
    now: () => new Date('2026-09-30T12:00:00Z'),
    id: () => `id-${++serial}`
  };
  return { repo: createMockReceivablesRepository(options), options, storage, saved, customers };
}
const title = (overrides = {}) => ({
  customerId: 'enabled',
  description: 'Lançamento teste',
  document: 'TESTE-1',
  issueDate: '2026-09-30',
  dueDate: '2026-10-31',
  totalCents: 10000,
  installmentCount: 1,
  notes: '',
  ...overrides
});
const payment = (amount, overrides = {}) => ({
  receivedAt: '2026-09-30',
  amountAppliedCents: amount,
  discountCents: 0,
  interestCents: 0,
  penaltyCents: 0,
  paymentMethodId: 'pix',
  notes: '',
  ...overrides
});

test('parcelamento exato, último centavo e calendário mensal sem drift', () => {
  const parts = splitInstallments(10000, 3, '2026-01-31');
  assert.deepEqual(
    parts.map((p) => p.originalAmountCents),
    [3333, 3333, 3334]
  );
  assert.deepEqual(
    parts.map((p) => p.dueDate),
    ['2026-01-31', '2026-02-28', '2026-03-31']
  );
  assert.equal(installmentDate('2028-01-31', 1), '2028-02-29');
  assert.equal(installmentDate('2026-12-31', 1), '2027-01-31');
  for (const count of [1, 2, 3, 17, 100])
    assert.equal(
      splitInstallments(10001, count, '2026-09-30').reduce((s, p) => s + p.originalAmountCents, 0),
      10001
    );
  for (const count of [0, -1, 1.5, NaN, 10001])
    assert.throws(() => splitInstallments(10000, count, '2026-09-30'));
  assert.throws(() => splitInstallments(0, 1, '2026-09-30'));
  assert.throws(() => splitInstallments(100, 1, '2026-02-30'));
});
test('prioridade cancelado, recebido, vencido, parcial e aberto', () => {
  const t = { originalAmountCents: 10000, dueDate: '2026-09-30' };
  assert.equal(titleStatus(t, [], '2026-09-30'), 'OPEN');
  assert.equal(titleStatus(t, [payment(3000)], '2026-09-30'), 'PARTIAL');
  assert.equal(titleStatus(t, [payment(3000)], '2026-10-01'), 'OVERDUE');
  assert.equal(titleStatus(t, [payment(10000)], '2026-10-01'), 'PAID');
  assert.equal(titleStatus({ ...t, canceledAt: 'date' }, [payment(10000)], '2026-10-01'), 'CANCELED');
  assert.equal(balanceCents(t, [payment(3000), payment(2000)]), 5000);
});
test('total recebido distingue principal, desconto, juros e multa', () => {
  assert.equal(paymentTotal(payment(50000, { discountCents: 2000 })), 48000);
  assert.equal(paymentTotal(payment(50000, { interestCents: 1000, penaltyCents: 500 })), 51500);
  assert.throws(() => paymentTotal(payment(500, { interestCents: -1 })));
});

test('datas civis não recuam pelo fuso e somatórios grandes preservam centavos', () => {
  assert.equal(formatReceivableDate('2026-09-30'), '30/09/2026');
  assert.equal(formatReceivableMoney(1000000000001), 'R$ 10.000.000.000,01');
  assert.equal(formatReceivableMoney(-1), '—');
});
test('criação obrigatória, elegibilidade, grupo, edição individual e persistência', async () => {
  const { repo, options } = setup();
  for (const override of [
    { customerId: '' },
    { customerId: 'inactive' },
    { customerId: 'disabled' },
    { description: '' },
    { totalCents: null },
    { dueDate: '' },
    { issueDate: '' }
  ])
    await assert.rejects(repo.createInstallments(title(override)));
  const parts = await repo.createInstallments(title({ installmentCount: 3 }));
  assert.equal(new Set(parts.map((p) => p.groupId)).size, 1);
  assert.equal(new Set(parts.map((p) => p.id)).size, 3);
  await repo.update(parts[1].id, { ...parts[1], originalAmountCents: 4500, description: 'Alterada' });
  assert.equal((await repo.getById(parts[0].id)).originalAmountCents, 3333);
  assert.equal((await repo.getById(parts[1].id)).originalAmountCents, 4500);
  assert.equal((await createMockReceivablesRepository(options).list()).total, 3);
  assert.equal((await repo.getById(parts[1].id)).history.length, 2);
});
test('baixas parciais e total, restrições de edição/cancelamento e sobrepagamento', async () => {
  const { repo } = setup();
  const [t] = await repo.create(title());
  await repo.receive(t.id, payment(3000, { discountCents: 100, interestCents: 20, penaltyCents: 10 }));
  let detail = await repo.getById(t.id);
  assert.equal(detail.balanceCents, 7000);
  assert.equal(detail.status, 'PARTIAL');
  assert.equal(detail.payments[0].totalReceivedCents, 2930);
  await assert.rejects(repo.cancel(t.id), /estorno/);
  for (const overrides of [
    { customerId: 'inactive' },
    { originalAmountCents: 11000 },
    { issueDate: '2026-09-29' }
  ])
    await assert.rejects(repo.update(t.id, { ...t, ...overrides }));
  await repo.update(t.id, { ...t, description: 'Permitida', dueDate: '2026-09-29' });
  assert.equal((await repo.getById(t.id)).status, 'OVERDUE');
  for (const p of [
    payment(7001),
    payment(0),
    payment(100, { discountCents: 101 }),
    payment(100, { paymentMethodId: 'missing' }),
    payment(100, { receivedAt: '' })
  ])
    await assert.rejects(repo.receive(t.id, p));
  await repo.receive(t.id, payment(2000));
  await repo.receive(t.id, payment(5000));
  detail = await repo.getById(t.id);
  assert.equal(detail.balanceCents, 0);
  assert.equal(detail.status, 'PAID');
  assert.equal(detail.payments.length, 3);
  assert.equal(detail.history.length, 5);
  await assert.rejects(repo.receive(t.id, payment(1)));
});
test('cancelamento lógico sem recebimentos, histórico e saldo excluído', async () => {
  const { repo } = setup();
  const [t] = await repo.create(title());
  await repo.cancel(t.id);
  assert.equal((await repo.list()).total, 1);
  assert.equal((await repo.getById(t.id)).status, 'CANCELED');
  assert.equal((await repo.getSummary()).outstanding.amount, 0);
  await assert.rejects(repo.receive(t.id, payment(1)));
  await assert.rejects(repo.update(t.id, t));
});
test('histórico resolve cliente inativado sem duplicá-lo; novos lançamentos bloqueados', async () => {
  const { repo, customers } = setup();
  const [t] = await repo.create(title());
  await customers.setActive('enabled', false);
  assert.equal((await repo.getById(t.id)).customer.status, 'INACTIVE');
  await assert.rejects(repo.create(title()));
  await repo.receive(t.id, payment(10000));
  assert.equal((await repo.getById(t.id)).status, 'PAID');
});
test('resumo usa saldo e datas reais das baixas; filtros e paginação', async () => {
  const { repo } = setup();
  const [t] = await repo.create(title());
  await repo.receive(t.id, payment(3000, { discountCents: 100 }));
  const [late] = await repo.create(title({ document: 'ATRASO', dueDate: '2026-09-01' }));
  await repo.receive(late.id, payment(1000, { receivedAt: '2026-08-01' }));
  const summary = await repo.getSummary();
  assert.equal(summary.due.amount, 7000);
  assert.equal(summary.overdue.amount, 9000);
  assert.equal(summary.outstanding.amount, 16000);
  assert.equal(summary.received.amount, 2900);
  assert.equal(
    (await repo.getSummary({ receivedFrom: '2026-08-01', receivedTo: '2026-08-31' })).received.amount,
    1000
  );
  assert.equal((await repo.list({ status: 'OVERDUE' })).total, 1);
  assert.equal((await repo.list({ search: '529.982.247-25' })).total, 2);
  assert.equal((await repo.list({ search: 'ATRASO' })).total, 1);
  assert.equal((await repo.list({ dueFrom: '2026-10-01' })).total, 1);
  assert.equal((await repo.list({ pageSize: 1, page: 2 })).page, 2);
  assert.equal((await repo.list({ customerId: 'missing' })).total, 0);
  assert.deepEqual(financialSummary([], [], {}, '2026-09-30').received, { amount: 0, count: 0 });
});
test('concorrência não permite duas baixas sobre o mesmo saldo', async () => {
  const { repo } = setup();
  const [t] = await repo.create(title());
  const results = await Promise.allSettled([
    repo.receive(t.id, payment(10000)),
    repo.receive(t.id, payment(10000))
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await repo.getById(t.id)).balanceCents, 0);
});
test('falha de escrita preserva estado; corrupção não é apagada', async () => {
  const { repo, storage, saved } = setup();
  const [t] = await repo.create(title());
  const previous = saved.get('erp.dev.receivables.v1');
  storage.setItem = () => {
    throw Error('quota');
  };
  await assert.rejects(repo.receive(t.id, payment(1000)), /salvar/);
  assert.equal(saved.get('erp.dev.receivables.v1'), previous);
  saved.set('erp.dev.receivables.v1', '{}');
  await assert.rejects(repo.list(), /inválidos/);
  assert.equal(saved.get('erp.dev.receivables.v1'), '{}');
});

test('busca por campo e ordenação antes da paginação', async () => {
  const { repo } = setup();
  await repo.create(title({ description: 'Zulu', document: 'DOC-A', totalCents: 20000 }));
  await repo.create(title({ description: 'Alfa', document: 'DOC-B', totalCents: 10000 }));
  assert.equal((await repo.list({ search: 'Zulu', searchField: 'name' })).total, 0);
  assert.equal((await repo.list({ search: 'Zulu', searchField: 'description' })).total, 1);
  assert.equal((await repo.list({ search: 'DOC-B', searchField: 'document' })).total, 1);
  const sorted = await repo.list({ sortBy: 'originalAmountCents', sortDirection: 'desc', pageSize: 1 });
  assert.equal(sorted.items[0].originalAmountCents, 20000);
});
