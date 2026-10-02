import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockBrandsRepository } from '../apps/web/src/features/brands/mockBrandsRepository.js';
import { normalizeProduct, emptyProduct } from '../apps/web/src/features/products/product-model.js';

// Repository injetado, sem navegador, backend ou dados pessoais reais.
const storageFactory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('nome obrigatório, opcionais vazios, status e código inicial', async () => {
  const repo = createMockBrandsRepository();
  await assert.rejects(repo.create({ name: ' ' }), /Informe o nome/);
  const brand = await repo.create({ name: ' Marca Teste ' });
  assert.equal(brand.name, 'Marca Teste');
  assert.equal(brand.cnpj, '');
  assert.equal(brand.contact, '');
  assert.equal(brand.active, true);
  assert.equal(brand.code, '0001');
  assert.equal((await repo.getById(brand.id)).id, brand.id);
});
test('duplicidade no repository, incluindo nome inativo e concorrência', async () => {
  const repo = createMockBrandsRepository();
  const brand = await repo.create({ name: 'Bosch' });
  await repo.setActive(brand.id, false);
  await assert.rejects(repo.create({ name: '  BOSCH ' }), /Já existe uma marca/);
  const results = await Promise.allSettled([repo.create({ name: 'Teste' }), repo.create({ name: 'teste' })]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
});
test('CNPJ alfanumérico normalizado e validade obrigatória quando preenchido', async () => {
  const repo = createMockBrandsRepository();
  const brand = await repo.create({ name: 'Demo', cnpj: '12.abc.345/01de-35' });
  assert.equal(brand.cnpj, '12ABC34501DE35');
  for (const cnpj of ['123', '12.ABC.345/01DE-00', '12@ABC34501DE35'])
    await assert.rejects(repo.create({ name: 'Inválida', cnpj }), /CNPJ inválido/);
});
test('busca por nome, CNPJ e contato: contém, começa e igualdade', async () => {
  const repo = createMockBrandsRepository();
  await repo.create({ name: 'Marca Demo', cnpj: '12ABC34501DE35', contact: 'Equipe comercial' });
  for (const [field, search, match] of [
    ['name', 'DEMO', 'contains'],
    ['name', 'marca', 'starts'],
    ['name', 'MARCA DEMO', 'equals'],
    ['cnpj', '12.ABC.345/01DE-35', 'equals'],
    ['contact', 'comercial', 'contains']
  ])
    assert.equal((await repo.list({ field, search, match })).total, 1);
  assert.equal((await repo.list({ field: 'name', search: 'Demo', match: 'starts' })).total, 0);
  assert.equal((await repo.list({ field: 'cnpj', search: '@' })).total, 0);
});
test('edição preserva identidade, impede duplicidade e ativa/inativa sem apagar', async () => {
  const repo = createMockBrandsRepository();
  const first = await repo.create({ name: 'Primeira' });
  const second = await repo.create({ name: 'Segunda' });
  await assert.rejects(repo.update(second.id, { name: 'primeira' }), /Já existe/);
  const edited = await repo.update(first.id, { name: 'Atualizada', contact: 'Contato' });
  assert.equal(edited.code, first.code);
  assert.equal(edited.createdAt, first.createdAt);
  await repo.setActive(first.id, false);
  assert.equal((await repo.list({ activeOnly: true })).total, 1);
  assert.equal((await repo.list()).total, 2);
  await repo.setActive(first.id, true);
  assert.equal((await repo.list({ activeOnly: true })).total, 2);
  await assert.rejects(repo.update('ausente', { name: 'X' }), /não encontrada/);
});
test('persistência, isolamento por escopo, erro de leitura e erro de gravação', async () => {
  const storage = storageFactory();
  await createMockBrandsRepository({ storage, key: 'a' }).create({ name: 'Local' });
  assert.equal((await createMockBrandsRepository({ storage, key: 'a' }).list()).total, 1);
  assert.equal((await createMockBrandsRepository({ storage, key: 'b' }).list()).total, 0);
  storage.setItem('a', 'corrompido');
  await assert.rejects(createMockBrandsRepository({ storage, key: 'a' }).list(), /dados foram preservados/);
  const failing = createMockBrandsRepository({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw Error();
      }
    }
  });
  await assert.rejects(failing.create({ name: 'Teste' }), /salvar/);
  assert.equal((await failing.list()).total, 0);
});
test('catálogo preserva marca legada e novo vínculo por ID', () => {
  assert.equal(normalizeProduct({ ...emptyProduct(), brand: 'Antiga' }).brand, 'Antiga');
  assert.equal(normalizeProduct({ ...emptyProduct(), brandId: 'marca-1' }).brandId, 'marca-1');
  assert.equal(
    normalizeProduct({ ...emptyProduct(), type: 'SERVICE', brandId: 'marca-1' }).brandId,
    undefined
  );
});
