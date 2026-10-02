import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockNcmRepository,
  resolveProductNcm
} from '../apps/web/src/features/ncm/mockNcmRepository.js';
import { emptyProduct, normalizeProduct } from '../apps/web/src/features/products/product-model.js';

// Valida estrutura e persistência local, não enquadramento fiscal.
test('código obrigatório, oito dígitos, descrição obrigatória e zeros preservados', async () => {
  const repo = createMockNcmRepository({ seed: () => [] });
  await assert.rejects(repo.create({ code: '', description: 'Teste' }), /Informe o código NCM/);
  for (const code of ['123', '123456789', '1234567A', '3305.10.00'])
    await assert.rejects(repo.create({ code, description: 'Teste' }), /exatamente 8 dígitos/);
  await assert.rejects(repo.create({ code: '00000012', description: '' }), /Informe a descrição/);
  const row = await repo.create({ code: ' 00000012 ', description: 'Teste' });
  assert.equal(row.code, '00000012');
  assert.equal(row.active, true);
  assert.equal((await repo.getById(row.id)).code, '00000012');
});
test('duplicidade no repository, inclusive inativos e edição', async () => {
  const repo = createMockNcmRepository();
  await repo.setActive('dev-ncm-33051000', false);
  await assert.rejects(
    repo.create({ code: '33051000', description: 'Outra' }),
    /Já existe um cadastro para este NCM/
  );
  await assert.rejects(
    repo.update('dev-ncm-21069090', { code: '33051000', description: 'Outra' }),
    /Já existe/
  );
});
test('busca código e descrição nas três correspondências', async () => {
  const repo = createMockNcmRepository();
  for (const [field, search, match] of [
    ['code', '330', 'starts'],
    ['code', '510', 'contains'],
    ['code', '33051000', 'equals'],
    ['description', 'xampus', 'contains'],
    ['description', 'Demonstração', 'starts'],
    ['description', 'Demonstração — xampus', 'equals']
  ])
    assert.ok((await repo.list({ field, search, match })).total > 0);
  assert.equal((await repo.list({ search: '99999999', match: 'equals' })).total, 0);
});
test('edição, inativação e reativação preservam identidade e histórico', async () => {
  const repo = createMockNcmRepository();
  const initial = await repo.getById('dev-ncm-33051000');
  const edited = await repo.update(initial.id, { code: '00000022', description: 'Alterado' });
  assert.equal(edited.id, initial.id);
  assert.equal(edited.createdAt, initial.createdAt);
  assert.equal(edited.code, '00000022');
  await repo.setActive(edited.id, false);
  assert.ok(!(await repo.list({ activeOnly: true })).items.some((row) => row.id === edited.id));
  assert.equal((await repo.list()).total, 3);
  await repo.setActive(edited.id, true);
  assert.equal((await repo.getById(edited.id)).active, true);
});
test('persistência, isolamento e falha de leitura preservam dados', async () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  await createMockNcmRepository({ storage }).setActive('dev-ncm-33051000', false);
  assert.equal((await createMockNcmRepository({ storage }).getById('dev-ncm-33051000')).active, false);
  assert.equal(
    (await createMockNcmRepository({ storage, key: 'outra' }).getById('dev-ncm-33051000')).active,
    true
  );
  data.set('erp.dev.ncm.v1', 'inválido');
  await assert.rejects(createMockNcmRepository({ storage }).list(), /preservados/);
});
test('novo produto bloqueia inativo e edição preserva vínculo ou código legado', async () => {
  const repo = createMockNcmRepository();
  const data = { ...emptyProduct(), ncm: '33051000' };
  const linked = await resolveProductNcm(repo, data);
  assert.equal(linked.ncmId, 'dev-ncm-33051000');
  await repo.setActive(linked.ncmId, false);
  await assert.rejects(resolveProductNcm(repo, data), /NCM ativo/);
  await assert.rejects(resolveProductNcm(repo, linked), /NCM ativo/);
  assert.equal((await resolveProductNcm(repo, linked, linked)).ncmId, linked.ncmId);
  assert.equal((await resolveProductNcm(repo, data, data)).ncm, '33051000');
  assert.equal(normalizeProduct(linked).ncmId, linked.ncmId);
  assert.equal(normalizeProduct({ ...linked, type: 'SERVICE' }).ncmId, undefined);
  assert.equal((await resolveProductNcm(repo, emptyProduct())).ncm, '');
});
