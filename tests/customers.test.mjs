import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockCustomersRepository } from '../apps/web/src/features/customers/mockCustomersRepository.js';
import {
  emptyCustomer,
  normalizeCustomer,
  validateCustomer
} from '../apps/web/src/features/customers/customer-model.js';
import {
  hydrateCustomer,
  customerErrors,
  validateCustomerRecord
} from '../apps/web/src/features/customers/customer-schema.js';
import { validateCpf } from '../apps/web/src/components/business/cpf.js';
import { mergeCepAddress } from '../apps/web/src/api/cep.js';

// Repository testado sem React, rede ou dados pessoais reais; documentos são fixtures matemáticas.
const person = () => ({
  ...hydrateCustomer(),
  name: 'Pessoa Teste',
  rg: 'RG-TESTE',
  document: '529.982.247-25',
  address: {
    ...emptyCustomer().address,
    street: 'Rua DEV',
    neighborhood: 'Centro DEV',
    city: 'Cidade DEV',
    state: 'TO'
  }
});
const company = () => ({
  ...person(),
  tradeName: 'Empresa Teste',
  type: 'COMPANY',
  legalName: 'Empresa Teste',
  document: '12.ABC.345/01DE-35'
});
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};
test('listagem, busca em campos, filtros e paginação no repository', async () => {
  const repo = createMockCustomersRepository();
  assert.equal((await repo.list()).total, 4);
  assert.equal((await repo.summary()).active, 2);
  for (const type of ['PERSON', 'COMPANY']) assert.equal((await repo.list({ type })).total, 2);
  for (const status of ['ACTIVE', 'INACTIVE']) assert.equal((await repo.list({ status })).total, 2);
  assert.equal((await repo.list({ city: 'curitiba', state: 'PR' })).total, 2);
  for (const search of [
    '529.982.247-25',
    '52998224725',
    'demo1@example.invalid',
    'Cliente Demonstração A',
    '12abc34501de35',
    'Empresa Demonstração Alfa'
  ])
    assert.equal((await repo.list({ search })).total, 1);
  assert.equal((await repo.list({ search: 'inexistente' })).total, 0);
  const first = await repo.list({ page: 1, pageSize: 2 });
  const second = await repo.list({ page: 2, pageSize: 2 });
  assert.equal(first.items.length, 2);
  assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal((await repo.list({ page: 100, pageSize: 2 })).page, 2);
});
test('criar PF/PJ, duplicidade, editar, detalhe, status e persistência DEV', async () => {
  const storage = memoryStorage();
  let next = 0;
  const repo = createMockCustomersRepository({ storage, seed: () => [], id: () => String(++next) });
  const pf = await repo.create({ ...person(), phone: '(63) 99999-9999' });
  const pj = await repo.create(company());
  assert.equal(pf.document, '52998224725');
  assert.equal(pj.document, '12ABC34501DE35');
  assert.equal((await repo.list({ search: '63999999999' })).total, 1);
  await assert.rejects(repo.create(person()), /Já existe/);
  await assert.rejects(repo.update(pj.id, { ...company(), document: 'invalid' }), /documento/);
  const updated = await repo.update(pf.id, { ...person(), name: 'Pessoa Atualizada' });
  assert.equal(updated.createdAt, pf.createdAt);
  assert.equal((await repo.getById(pf.id)).name, 'Pessoa Atualizada');
  assert.equal((await repo.setActive(pf.id, false)).status, 'INACTIVE');
  assert.equal((await repo.summary()).active, 1);
  assert.equal((await repo.setActive(pf.id, true)).status, 'ACTIVE');
  assert.equal((await createMockCustomersRepository({ storage }).list()).total, 2);
  assert.equal(await repo.getById('absent'), null);
  await assert.rejects(repo.update('absent', person()), /não encontrado/);
  const clone = await repo.getById(pf.id);
  clone.name = 'alterado externamente';
  assert.notEqual((await repo.getById(pf.id)).name, clone.name);
});
test('CPF, CNPJ alfanumérico e validações opcionais', () => {
  assert.ok(validateCpf('529.982.247-25'));
  assert.ok(!validateCpf('52998224726'));
  assert.ok(!validateCpf('11111111111'));
  assert.ok(!validateCpf('52998224725x'));
  assert.equal(validateCustomer(company()), '');
  assert.equal(normalizeCustomer(company()).document, '12ABC34501DE35');
  for (const input of [
    { name: '' },
    { document: '123' },
    { email: 'a@' },
    { phone: '123' },
    { mobile: 'abcdef' },
    { birthDate: '2026-02-30' },
    { birthDate: '2999-01-01' }
  ])
    assert.ok(validateCustomer({ ...person(), ...input }));
  for (const address of [{ cep: '123' }, { state: 'XX' }])
    assert.ok(validateCustomer({ ...person(), address: { ...emptyCustomer().address, ...address } }));
  assert.equal(normalizeCustomer({ ...company(), name: 'Não se aplica', birthDate: '2000-01-01' }).name, '');
});
test('falhas de armazenamento preservam dados e reportam erro', async () => {
  const repo = createMockCustomersRepository({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      }
    },
    seed: () => []
  });
  await assert.rejects(repo.create(person()), /salvar/);
  assert.equal((await repo.list()).total, 0);
  await assert.rejects(
    createMockCustomersRepository({ storage: { getItem: () => '{broken' } }).list(),
    /ler/
  );
  const storage = memoryStorage();
  storage.setItem('erp.dev.customers.v1', '[]');
  assert.equal((await createMockCustomersRepository({ storage }).list()).total, 0);
});
test('CEP preenche endereço sem substituir número e complemento', () => {
  const address = { ...emptyCustomer().address, cep: '77800-000', number: '10', complement: 'Sala teste' };
  const result = mergeCepAddress(
    address,
    { cep: '77800000', street: 'Rua Teste', neighborhood: 'Bairro teste', city: 'Cidade teste', state: 'TO' },
    { street: 'street', neighborhood: 'neighborhood', city: 'city', state: 'state' }
  );
  assert.equal(result.number, '10');
  assert.equal(result.complement, 'Sala teste');
  assert.equal(result.street, 'Rua Teste');
  assert.equal(result.neighborhood, 'Bairro teste');
});

test('novos campos, etapas, inscrição e preferências financeiras', () => {
  assert.equal(validateCustomerRecord(person()), '');
  assert.equal(hydrateCustomer().taxpayerType, '1');
  for (const key of ['name', 'rg', 'document']) assert.ok(customerErrors({ ...person(), [key]: '' }, 0)[key]);
  for (const key of ['street', 'neighborhood', 'city', 'state'])
    assert.ok(
      customerErrors({ ...person(), address: { ...person().address, [key]: '' } }, 0)[`address.${key}`]
    );
  for (const registrationType of ['COM INSC', 'ISENTO']) {
    const errors = customerErrors({ ...person(), registrationType }, 1);
    assert.ok(errors.stateRegistration && errors.municipalRegistration);
  }
  assert.deepEqual(customerErrors({ ...person(), registrationType: 'SEM INSC' }, 1), {});
  assert.equal(validateCustomerRecord({ ...company(), legalName: '' }), '');
  assert.ok(customerErrors({ ...person(), taxpayerType: '3' }, 1).taxpayerType);
  for (const creditLimit of [-1, 1.1, NaN, null])
    assert.ok(
      customerErrors({ ...person(), financial: { allowReceivables: true, creditLimit } }, 2).creditLimit
    );
  assert.deepEqual(
    customerErrors({ ...person(), financial: { allowReceivables: true, creditLimit: 123456 } }, 2),
    {}
  );
});
test('mocks anteriores são hidratados sem perder dados ou exigir RG na leitura', async () => {
  const storage = memoryStorage();
  const old = {
    ...emptyCustomer(),
    id: 'legacy',
    name: 'Cadastro anterior DEV',
    document: '52998224725',
    createdAt: '2026-01-01'
  };
  storage.setItem('erp.dev.customers.v1', JSON.stringify([old]));
  const repo = createMockCustomersRepository({ storage });
  const record = await repo.getById('legacy');
  assert.equal(record.name, old.name);
  assert.equal(record.rg, '');
  assert.equal(record.taxpayerType, '1');
  assert.deepEqual(record.financial, { allowReceivables: false, creditLimit: 0 });
  assert.equal(JSON.parse(storage.getItem('erp.dev.customers.v1'))[0].rg, undefined);
  await repo.setActive('legacy', false);
  assert.equal((await repo.getById('legacy')).createdAt, old.createdAt);
  await assert.rejects(repo.update('legacy', record), /obrigatório/);
});
