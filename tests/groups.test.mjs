import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockGroupsRepository } from '../apps/web/src/features/product-groups/mockGroupsRepository.js';
import { createMockBrandsRepository } from '../apps/web/src/features/brands/mockBrandsRepository.js';
import { emptyProduct, normalizeProduct } from '../apps/web/src/features/products/product-model.js';

// Contratos locais testados sem React, HTTP ou alteração de dados do usuário.
const storageFactory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('grupo exige apenas nome e começa ativo, sem hierarquia', async () => {
  const repo = createMockGroupsRepository();
  await assert.rejects(repo.create({ name: ' ' }), /Informe o nome do grupo/);
  const group = await repo.create({ name: ' Bebidas ', parentId: 'ignorado' });
  assert.equal(group.name, 'Bebidas');
  assert.equal(group.description, '');
  assert.equal(group.active, true);
  assert.equal(group.code, '0001');
  assert.equal(group.parentId, undefined);
  assert.equal(group.cnpj, undefined);
  assert.deepEqual(await repo.getById(group.id), group);
});
test('duplicidade normalizada, inclusive inativo, edição e concorrência', async () => {
  const repo = createMockGroupsRepository();
  const group = await repo.create({ name: 'Bebidas Gerais' });
  await repo.setActive(group.id, false);
  await assert.rejects(repo.create({ name: ' bebidas   gerais ' }), /Já existe um grupo com este nome/);
  const second = await repo.create({ name: 'Outro' });
  await assert.rejects(repo.update(second.id, { name: 'BEBIDAS GERAIS' }), /Já existe/);
  const results = await Promise.allSettled([repo.create({ name: 'Teste' }), repo.create({ name: 'teste' })]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
});
test('busca nome e descrição com contém, começa e igual', async () => {
  const repo = createMockGroupsRepository();
  await repo.create({ name: 'Materiais', description: 'Itens para oficina' });
  for (const [field, search, match] of [
    ['name', 'ter', 'contains'],
    ['name', 'mat', 'starts'],
    ['name', 'MATERIAIS', 'equals'],
    ['description', 'OFICINA', 'contains'],
    ['description', 'itens', 'starts'],
    ['description', 'Itens para oficina', 'equals']
  ])
    assert.equal((await repo.list({ field, search, match })).total, 1);
  assert.equal((await repo.list({ field: 'description', search: 'oficina', match: 'starts' })).total, 0);
});
test('edição, inativação e reativação preservam identidade e registro', async () => {
  const repo = createMockGroupsRepository();
  const group = await repo.create({ name: 'Inicial' });
  const edited = await repo.update(group.id, { name: 'Atualizado', description: 'Descrição' });
  assert.equal(edited.id, group.id);
  assert.equal(edited.code, group.code);
  assert.equal(edited.createdAt, group.createdAt);
  assert.equal(edited.description, 'Descrição');
  await repo.setActive(group.id, false);
  assert.equal((await repo.list({ activeOnly: true })).total, 0);
  assert.equal((await repo.list()).total, 1);
  await repo.setActive(group.id, true);
  assert.equal((await repo.list({ activeOnly: true })).total, 1);
  await assert.rejects(repo.setActive('ausente', false), /não encontrado/);
  await assert.rejects(repo.update('ausente', { name: 'X' }), /não encontrado/);
});
test('storage isolado, leitura inválida e falha de gravação preservam dados', async () => {
  const storage = storageFactory();
  await createMockGroupsRepository({ storage }).create({ name: 'Grupo' });
  assert.equal((await createMockGroupsRepository({ storage }).list()).total, 1);
  assert.equal((await createMockBrandsRepository({ storage }).list()).total, 0);
  assert.equal((await createMockGroupsRepository({ storage, key: 'outra-empresa' }).list()).total, 0);
  storage.setItem('erp.dev.product-groups.v1', 'invalid');
  await assert.rejects(createMockGroupsRepository({ storage }).list(), /preservados/);
  const failing = createMockGroupsRepository({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw Error();
      }
    }
  });
  await assert.rejects(failing.create({ name: 'Grupo' }), /salvar/);
  assert.equal((await failing.list()).total, 0);
});
test('produtos preservam categoria antiga e vínculo por ID', () => {
  const legacy = normalizeProduct({ ...emptyProduct(), category: 'Bebidas' });
  assert.equal(legacy.category, 'Bebidas');
  assert.equal(legacy.groupId, '');
  const linked = normalizeProduct({ ...emptyProduct(), groupId: 'grupo-1', category: 'Bebidas' });
  assert.equal(linked.groupId, 'grupo-1');
});
