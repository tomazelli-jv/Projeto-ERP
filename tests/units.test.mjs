import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockUnitsRepository,
  resolveProductUnit
} from '../apps/web/src/features/units/mockUnitsRepository.js';
import { createMockBrandsRepository } from '../apps/web/src/features/brands/mockBrandsRepository.js';
import { emptyProduct, normalizeProduct } from '../apps/web/src/features/products/product-model.js';

// Repository e vínculos locais exercitados sem backend ou dados reais.
const storageFactory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('fixtures DEV e campos obrigatórios, sem conversão', async () => {
  const repo = createMockUnitsRepository();
  const rows = (await repo.list()).items;
  for (const abbreviation of ['UN', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'CX', 'PC', 'PCT', 'H'])
    assert.ok(rows.some((row) => row.abbreviation === abbreviation));
  await assert.rejects(repo.create({ abbreviation: ' ', description: 'Descrição' }), /Informe a sigla/);
  await assert.rejects(repo.create({ abbreviation: 'ZZ', description: '' }), /Informe a descrição/);
  const unit = await repo.create({ abbreviation: ' fd ', description: 'Fardo', factor: 12 });
  assert.equal(unit.abbreviation, 'FD');
  assert.equal(unit.active, true);
  assert.equal(unit.factor, undefined);
  assert.equal(unit.name, undefined);
});
test('duplicidade de sigla normalizada inclusive inativa e na edição', async () => {
  const repo = createMockUnitsRepository();
  await assert.rejects(
    repo.create({ abbreviation: 'un', description: 'Outra' }),
    /Já existe uma unidade de medida com esta sigla/
  );
  await repo.setActive('dev-unit-UN', false);
  await assert.rejects(repo.create({ abbreviation: ' Un ', description: 'Outra' }), /Já existe/);
  await assert.rejects(repo.update('dev-unit-KG', { abbreviation: 'UN', description: 'Outra' }), /Já existe/);
  // Descrições iguais são permitidas: a identidade é a sigla.
  await repo.create({ abbreviation: 'ZZ', description: 'Unidade' });
});
test('siglas preservam letras/dígitos e rejeitam caracteres sem removê-los', async () => {
  const repo = createMockUnitsRepository({ seed: () => [] });
  const unit = await repo.create({ abbreviation: ' m2 ', description: 'Metro quadrado' });
  assert.equal(unit.abbreviation, 'M2');
  const numeric = await repo.create({ abbreviation: '01', description: 'Teste' });
  assert.equal(numeric.abbreviation, '01');
  await assert.rejects(repo.create({ abbreviation: 'M@2', description: 'Inválida' }), /letras ou números/);
});
test('busca por sigla e descrição nas três correspondências', async () => {
  const repo = createMockUnitsRepository();
  assert.equal((await repo.list({ search: 'KG', match: 'equals' })).total, 1);
  assert.equal((await repo.list({ search: 'M', match: 'starts' })).total, 4);
  assert.equal((await repo.list({ search: '2', match: 'contains' })).total, 1);
  assert.equal((await repo.list({ field: 'description', search: 'quilograma', match: 'equals' })).total, 1);
  assert.equal((await repo.list({ field: 'description', search: 'Metro', match: 'starts' })).total, 3);
  assert.equal((await repo.list({ field: 'description', search: 'quadrado', match: 'contains' })).total, 1);
});
test('edição e status preservam registro, código e criação', async () => {
  const repo = createMockUnitsRepository();
  const before = await repo.getById('dev-unit-CX');
  const after = await repo.update(before.id, { abbreviation: 'CXX', description: 'Caixa teste' });
  assert.equal(after.code, before.code);
  assert.equal(after.createdAt, before.createdAt);
  await repo.setActive(before.id, false);
  assert.ok(!(await repo.list({ activeOnly: true })).items.some((row) => row.id === before.id));
  assert.ok(await repo.getById(before.id));
  await repo.setActive(before.id, true);
  assert.equal((await repo.getById(before.id)).active, true);
});
test('persistência e isolamento, sem reseed ao esvaziar storage', async () => {
  const storage = storageFactory();
  await createMockUnitsRepository({ storage }).setActive('dev-unit-UN', false);
  assert.equal((await createMockUnitsRepository({ storage }).getById('dev-unit-UN')).active, false);
  assert.equal(
    (await createMockUnitsRepository({ storage, key: 'outra' }).getById('dev-unit-UN')).active,
    true
  );
  assert.equal((await createMockBrandsRepository({ storage }).list()).total, 0);
  storage.setItem('erp.dev.units.v1', '[]');
  assert.equal((await createMockUnitsRepository({ storage }).list()).total, 0);
  storage.setItem('erp.dev.units.v1', 'inválido');
  await assert.rejects(createMockUnitsRepository({ storage }).list(), /preservados/);
});
test('unidade inativa bloqueia novo produto mas preserva legado e vínculo por ID', async () => {
  const repo = createMockUnitsRepository();
  const data = emptyProduct();
  const linked = await resolveProductUnit(repo, data);
  assert.equal(linked.unitId, 'dev-unit-UN');
  await repo.setActive('dev-unit-UN', false);
  await assert.rejects(resolveProductUnit(repo, data), /Selecione uma unidade ativa/);
  await assert.rejects(resolveProductUnit(repo, linked), /Selecione uma unidade ativa/);
  assert.equal((await resolveProductUnit(repo, data, data)).unit, 'UN');
  assert.equal((await resolveProductUnit(repo, linked, linked)).unitId, 'dev-unit-UN');
  const unknown = { ...data, unit: 'ANTIGA' };
  assert.equal((await resolveProductUnit(repo, unknown, unknown)).unit, 'ANTIGA');
  assert.equal(normalizeProduct(linked).unitId, 'dev-unit-UN');
});
