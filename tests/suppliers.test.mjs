import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSuppliersRepository } from '../apps/web/src/features/suppliers/mockSuppliersRepository.js';
import {
  emptySupplier,
  normalizeSupplier,
  validateSupplier
} from '../apps/web/src/features/suppliers/supplier-model.js';
import { validateCpf } from '../apps/web/src/components/business/cpf.js';
import { mergeCepAddress } from '../apps/web/src/api/cep.js';

// Repository testado sem React, rede ou dados pessoais reais; documentos são fixtures matemáticas.
const person = () => ({ ...emptySupplier(), name: 'Pessoa Teste', document: '529.982.247-25' });
const company = () => ({
  ...emptySupplier(),
  type: 'COMPANY',
  legalName: 'Empresa Teste',
  document: '12.ABC.345/01DE-35'
});
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};
test('listagem, busca em campos, filtros e paginação no repository', async () => {
  const repo = createMockSuppliersRepository();
  assert.equal((await repo.list()).total, 4);
  assert.equal((await repo.summary()).active, 2);
  for (const type of ['PERSON', 'COMPANY']) assert.equal((await repo.list({ type })).total, 2);
  for (const status of ['ACTIVE', 'INACTIVE']) assert.equal((await repo.list({ status })).total, 2);
  assert.equal((await repo.list({ city: 'curitiba', state: 'PR' })).total, 2);
  for (const search of [
    '529.982.247-25',
    '52998224725',
    'fornecedor1@example.invalid',
    '12abc34501de35',
    'Fornecedor Demonstração Alfa'
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
  const repo = createMockSuppliersRepository({ storage, seed: () => [], id: () => String(++next) });
  const pf = await repo.create({ ...person(), phone: '(63) 99999-9999' });
  const pj = await repo.create(company());
  assert.equal(pf.document, '52998224725');
  assert.equal(pj.document, '12ABC34501DE35');
  assert.equal((await repo.list({ search: '63999999999' })).total, 1);
  await assert.rejects(repo.create(person()), /Já existe/);
  await assert.rejects(repo.update(pj.id, { ...company(), document: 'invalid' }), /CNPJ/);
  const updated = await repo.update(pf.id, { ...person(), name: 'Pessoa Atualizada' });
  assert.equal(updated.createdAt, pf.createdAt);
  assert.equal((await repo.getById(pf.id)).name, 'Pessoa Atualizada');
  assert.equal((await repo.setActive(pf.id, false)).status, 'INACTIVE');
  assert.equal((await repo.summary()).active, 1);
  assert.equal((await repo.setActive(pf.id, true)).status, 'ACTIVE');
  assert.equal((await createMockSuppliersRepository({ storage }).list()).total, 2);
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
  assert.equal(validateSupplier(company()), '');
  assert.equal(normalizeSupplier(company()).document, '12ABC34501DE35');
  for (const input of [
    { name: '' },
    { document: '123' },
    { email: 'a@' },
    { phone: '123' },
    { mobile: 'abcdef' },
    { phone: 'abcdefghij' }
  ])
    assert.ok(validateSupplier({ ...person(), ...input }));
  for (const address of [{ cep: '123' }, { state: 'XX' }])
    assert.ok(validateSupplier({ ...person(), address: { ...emptySupplier().address, ...address } }));
  assert.equal(normalizeSupplier({ ...company(), name: 'Não se aplica', birthDate: '2000-01-01' }).name, '');
});
test('falhas de armazenamento preservam dados e reportam erro', async () => {
  const repo = createMockSuppliersRepository({
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
    createMockSuppliersRepository({ storage: { getItem: () => '{broken' } }).list(),
    /ler/
  );
  const storage = memoryStorage();
  storage.setItem('erp.dev.suppliers.v1', '[]');
  assert.equal((await createMockSuppliersRepository({ storage }).list()).total, 0);
});
test('CEP preenche endereço sem substituir número e complemento', () => {
  const address = { ...emptySupplier().address, cep: '77800-000', number: '10', complement: 'Sala teste' };
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

// Dados comerciais são específicos de Fornecedores e não contaminam Clientes.
test('campos comerciais e isolamento entre repositories', async () => {
  assert.ok(validateSupplier({ ...company(), commercialEmail: 'invalido' }));
  assert.ok(validateSupplier({ ...company(), commercialPhone: '123' }));
  const input = {
    ...company(),
    commercialContact: 'Comercial teste',
    commercialEmail: 'teste@example.invalid',
    commercialPhone: '(63) 99999-9999'
  };
  const storage = memoryStorage();
  const suppliers = createMockSuppliersRepository({ storage, seed: () => [] });
  const record = await suppliers.create(input);
  assert.equal(record.commercialPhone, '63999999999');
  const { createMockCustomersRepository } =
    await import('../apps/web/src/features/customers/mockCustomersRepository.js');
  assert.equal((await createMockCustomersRepository({ storage }).list()).total, 4);
  assert.equal((await suppliers.list()).total, 1);
  assert.equal((await suppliers.getById(record.id)).commercialEmail, 'teste@example.invalid');
  const pf = normalizeSupplier({
    ...person(),
    commercialNotes: 'Anotações PF',
    commercialEmail: 'nao-aplica'
  });
  assert.equal(pf.commercialNotes, 'Anotações PF');
  assert.equal(pf.commercialEmail, '');
  assert.ok(!('birthDate' in pf));
});
