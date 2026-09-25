import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockProductsRepository } from '../apps/web/src/features/products/mockProductsRepository.js';
import {
  emptyProduct,
  normalizeProduct,
  validateProduct
} from '../apps/web/src/features/products/product-model.js';
import { parseMoney, validMoney, formatMoney } from '../apps/web/src/components/business/money.js';

// Exercita contratos do catálogo sem React, rede ou valores operacionais reais.
const product = () => ({
  ...emptyProduct(),
  name: 'Item teste',
  code: '0008',
  priceCents: 12345,
  gtin: '00012345678905',
  ncm: '01010101'
});
const storageFactory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('dinheiro exato em centavos, formato BRL e entrada inválida', () => {
  assert.equal(parseMoney('1.234,56'), 123456);
  assert.equal(parseMoney('0,01'), 1);
  assert.equal(parseMoney('R$ 10,10'), 1010);
  assert.equal(parseMoney(''), null);
  for (const text of ['-1', '1,234', '1e3', 'Infinity', '10000000000,00', '1.23'])
    assert.ok(Number.isNaN(parseMoney(text)));
  assert.equal(parseMoney('0,10') + parseMoney('0,20'), 30);
  assert.ok(!validMoney(1.5));
  assert.ok(formatMoney(12345).includes('123,45'));
});
test('listagem, resumo, busca, filtros e paginação', async () => {
  const repo = createMockProductsRepository();
  assert.equal((await repo.list()).total, 5);
  assert.deepEqual(await repo.summary(), { total: 5, products: 3, services: 2, active: 3 });
  assert.equal((await repo.list({ type: 'PRODUCT' })).total, 3);
  assert.equal((await repo.list({ type: 'SERVICE' })).total, 2);
  assert.equal((await repo.list({ status: 'INACTIVE' })).total, 2);
  assert.equal((await repo.list({ category: 'Bebidas' })).total, 1);
  assert.equal((await repo.list({ unit: 'H' })).total, 1);
  for (const search of ['0001', '00012345678905', 'refrigerante', 'Bebidas'])
    assert.equal((await repo.list({ search })).total, 1);
  assert.equal((await repo.list({ page: 2, pageSize: 2 })).items.length, 2);
  assert.equal((await repo.list({ page: 99, pageSize: 2 })).page, 3);
  assert.equal((await repo.list({ search: 'inexistente' })).total, 0);
});
test('criação, edição, código duplicado, detalhe, status e persistência', async () => {
  const storage = storageFactory();
  const repo = createMockProductsRepository({ storage, seed: () => [] });
  const record = await repo.create(product());
  assert.equal(record.code, '0008');
  assert.equal(record.gtin, '00012345678905');
  assert.equal(record.ncm, '01010101');
  assert.equal(record.priceCents, 12345);
  await assert.rejects(repo.create({ ...product(), code: ' 0008 ' }), /Já existe/);
  const edited = await repo.update(record.id, {
    ...product(),
    name: 'Nome novo',
    trackStock: true,
    minimumStock: '1,5'
  });
  assert.equal(edited.createdAt, record.createdAt);
  assert.equal((await repo.getById(record.id)).name, 'Nome novo');
  assert.equal((await repo.setActive(record.id, false)).status, 'INACTIVE');
  assert.equal((await repo.setActive(record.id, true)).status, 'ACTIVE');
  assert.equal((await createMockProductsRepository({ storage }).list()).total, 1);
  assert.equal(await repo.getById('ausente'), null);
  await assert.rejects(repo.update('ausente', product()), /não encontrado/);
});
test('campos específicos de produto e serviço não se misturam', async () => {
  const repo = createMockProductsRepository({ seed: () => [] });
  const service = await repo.create({
    ...product(),
    type: 'SERVICE',
    durationMinutes: '30',
    trackStock: true,
    minimumStock: '5',
    brand: 'Não aplicável'
  });
  for (const key of [
    'gtin',
    'ncm',
    'brand',
    'manufacturerReference',
    'trackStock',
    'minimumStock',
    'costCents'
  ])
    assert.ok(!(key in service));
  assert.equal(service.durationMinutes, '30');
  const item = normalizeProduct({
    ...product(),
    durationMinutes: '30',
    serviceDescription: 'Não aplicável',
    trackStock: false,
    minimumStock: '99'
  });
  assert.ok(!('durationMinutes' in item));
  assert.equal(item.minimumStock, '');
});
test('validações obrigatórias e numéricas', () => {
  for (const values of [
    { name: '' },
    { code: '' },
    { priceCents: null },
    { priceCents: -1 },
    { priceCents: 0.5 },
    { unit: '' },
    { gtin: 'abc' },
    { gtin: '123' },
    { ncm: '1234567' },
    { costCents: -1 },
    { trackStock: true, minimumStock: '-1' }
  ])
    assert.ok(validateProduct({ ...product(), ...values }));
  assert.ok(validateProduct({ ...product(), type: 'SERVICE', durationMinutes: '-1' }));
  assert.ok(validateProduct({ ...product(), type: 'SERVICE', durationMinutes: '0.5' }));
  assert.equal(validateProduct({ ...product(), priceCents: 0 }), '');
});
test('storage vazio, corrompido e falha ao gravar', async () => {
  const storage = storageFactory();
  storage.setItem('erp.dev.products.v1', '[]');
  assert.equal((await createMockProductsRepository({ storage }).list()).total, 0);
  storage.setItem('erp.dev.products.v1', '{inválido');
  await assert.rejects(createMockProductsRepository({ storage }).list(), /ler/);
  await assert.rejects(
    createMockProductsRepository({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw Error();
        }
      }
    }).create(product()),
    /salvar/
  );
});
