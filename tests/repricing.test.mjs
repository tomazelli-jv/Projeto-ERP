import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPricePreview,
  calculatePrice,
  parseAdjustment,
  priceChangeLabel,
  summarizePreview,
  validNewPrice
} from '../apps/web/src/features/products/repricing.js';
import {
  createMockProductsRepository,
  productFixtures
} from '../apps/web/src/features/products/mockProductsRepository.js';

// Contratos monetários e atomicidade do mesmo repository usado pela Consulta de Produtos.
const fixture = () =>
  productFixtures()
    .filter((p) => p.type === 'PRODUCT')
    .map((p, i) => ({
      ...p,
      status: 'ACTIVE',
      priceCents: 10000,
      groupId: `g${i}`,
      brandId: `b${i}`,
      brand: `Marca ${i}`
    }));
const change = (id, old = 10000, next = 10500) => ({
  productId: id,
  previousPriceCents: old,
  newPriceCents: next
});
const create = (opts = {}) => createMockProductsRepository({ seed: fixture, ...opts });

test('percentual, valor e preço direto usam centavos inteiros', () => {
  for (const [mode, value, expected] of [
    ['PERCENT', '5', 10500],
    ['PERCENT', '-5', 9500],
    ['VALUE', '10', 11000],
    ['VALUE', '-10', 9000],
    ['FIXED', '89,90', 8990]
  ])
    assert.equal(calculatePrice(10000, mode, parseAdjustment(value, mode)), expected);
  assert.equal(calculatePrice(999, 'PERCENT', 500), 1049);
  assert.equal(calculatePrice(1, 'PERCENT', 5000), 2);
  assert.equal(calculatePrice(999, 'PERCENT', -500), 949);
  assert.equal(priceChangeLabel(999, 1049), '+5,01%');
  assert.equal(priceChangeLabel(1000, 950), '-5,00%');
  assert.equal(priceChangeLabel(0, 100), 'Novo preço (anterior zero)');
});

test('valores inválidos, zero, negativos e excesso de casas não autorizam aplicação', () => {
  for (const value of ['', 'x', '1,234', 'Infinity']) assert.throws(() => parseAdjustment(value, 'VALUE'));
  assert.throws(() => buildPricePreview([], 'VALUE', '10'));
  assert.throws(() => buildPricePreview([{ ...fixture()[0], status: 'INACTIVE' }], 'VALUE', '10'));
  assert.throws(() => buildPricePreview([{ ...fixture()[0], type: 'SERVICE' }], 'VALUE', '10'));
  for (const amount of [0, -1, NaN, null, 1.1, 1000000000000]) assert.equal(validNewPrice(amount), false);
  const preview = buildPricePreview(fixture(), 'PERCENT', '-100');
  assert.equal(summarizePreview(preview).invalid, 3);
});

test('prévia, edição individual e resumo não persistem', async () => {
  const repo = create();
  const preview = buildPricePreview((await repo.list()).items, 'VALUE', '0');
  assert.equal(summarizePreview(preview).unchanged, 3);
  preview[0].newPriceCents = 1049;
  preview[0].manual = true;
  preview[1].newPriceCents = 11000;
  assert.deepEqual(summarizePreview(preview), {
    selected: 3,
    changed: 2,
    unchanged: 1,
    increases: 1,
    reductions: 1,
    invalid: 0
  });
  assert.equal((await repo.getById(preview[0].productId)).priceCents, 10000);
});

test('persistência em lote na fonte única altera somente preço e updatedAt', async () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const repo = create({ storage });
  const before = await repo.getById('demo-product-1');
  assert.equal((await repo.updatePrices([change('demo-product-1')])).length, 1);
  assert.equal((await create({ storage }).getById('demo-product-1')).priceCents, 10500);
  await repo.updatePrices([change('demo-product-1', 10500, 9900), change('demo-product-3', 10000, 8990)]);
  const after = await repo.getById('demo-product-1');
  const { priceCents: oldPrice, updatedAt: oldDate, ...oldRest } = before;
  const { priceCents: newPrice, updatedAt: newDate, ...newRest } = after;
  assert.equal(oldPrice, 10000);
  assert.equal(newPrice, 9900);
  assert.ok(oldDate && newDate);
  assert.deepEqual(newRest, oldRest);
  assert.equal((await repo.list({ search: '0003' })).items[0].priceCents, 8990);
});

test('conflito, inativos, duplicação e preço inválido abortam o lote inteiro', async () => {
  for (const invalid of [
    change('demo-product-3', 9999),
    change('demo-product-3', 10000, 0),
    change('missing'),
    change('demo-product-1')
  ]) {
    const repo = create();
    await assert.rejects(repo.updatePrices([change('demo-product-1'), invalid]));
    assert.equal((await repo.getById('demo-product-1')).priceCents, 10000);
  }
  const repo = create();
  await repo.setActive('demo-product-3', false);
  await assert.rejects(repo.updatePrices([change('demo-product-1'), change('demo-product-3')]), /inativo/);
  assert.equal((await repo.getById('demo-product-1')).priceCents, 10000);
  await assert.rejects(repo.updatePrices([]));
});

test('sem alteração não grava; falha de armazenamento não deixa atualização parcial', async () => {
  let writes = 0;
  const repo = create({
    storage: {
      getItem: () => null,
      setItem: () => {
        writes++;
        throw Error('quota');
      }
    }
  });
  assert.deepEqual(await repo.updatePrices([change('demo-product-1', 10000, 10000)]), []);
  assert.equal(writes, 0);
  await assert.rejects(repo.updatePrices([change('demo-product-1')]), /armazenamento/);
  assert.equal((await repo.getById('demo-product-1')).priceCents, 10000);
});

test('filtros por campos reais, grupo, marca, status e paginação', async () => {
  const repo = create();
  for (const [searchField, search] of [
    ['name', 'Refrigerante'],
    ['code', '0001'],
    ['gtin', '00012345678905']
  ])
    assert.equal((await repo.list({ searchField, search })).total, 1);
  assert.equal((await repo.list({ searchField: 'name', search: '0001' })).total, 0);
  assert.equal((await repo.list({ groupId: 'g1', brandId: 'b1' })).total, 1);
  await repo.setActive('demo-product-1', false);
  assert.equal((await repo.list({ status: 'INACTIVE' })).total, 1);
  assert.equal((await repo.list({ status: 'ACTIVE' })).total, 2);
  assert.equal((await repo.list({ page: 2, pageSize: 1 })).page, 2);
  const legacy = createMockProductsRepository();
  assert.equal((await legacy.list({ groupId: 'legacy', groupName: 'Bebidas', type: 'PRODUCT' })).total, 1);
});
