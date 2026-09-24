import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canManageBusiness,
  businessScope,
  addressLines,
  lojaPayload,
  validateLoja,
  businessError
} from '../apps/web/src/components/business/business-model.js';
import { formatCnpj, normalizeCnpj } from '../apps/web/src/components/business/business-formatters.js';
const form = {
  nome: 'Loja Teste',
  razaoSocial: '',
  tipoPessoa: 2,
  documento: '12.ABC.345/01DE-35',
  telefone: '',
  email: '',
  cep: '',
  cidade: '',
  rua: '',
  uf: '',
  ativo: false
};
// Contrato auditado: letras e zeros do documento nunca passam por conversão numérica.
test('CNPJ alfanumérico e legado preservados no payload', () => {
  assert.equal(normalizeCnpj(form.documento), '12ABC34501DE35');
  assert.equal(formatCnpj('12ABC34501DE35'), form.documento);
  assert.equal(formatCnpj('11222333000181'), '11.222.333/0001-81');
  assert.equal(normalizeCnpj('00.ABC.345/01DE-35'), '00ABC34501DE35');
  assert.equal(validateLoja(form), '');
  assert.equal(lojaPayload(1, form, false).documento, '12ABC34501DE35');
});
test('create e update têm allowlists oficiais; DELETE não participa do status', () => {
  const created = lojaPayload(1, { ...form, numero: '999', bairro: 'fake', nomeFantasia: 'legacy' }, false);
  assert.deepEqual(
    Object.keys(created).sort(),
    [
      'empresaId',
      'nome',
      'razaoSocial',
      'tipoPessoa',
      'documento',
      'telefone',
      'email',
      'cep',
      'cidade',
      'rua',
      'uf'
    ].sort()
  );
  assert.equal(lojaPayload(1, form, true).ativo, false);
  assert.equal(lojaPayload(1, { ...form, ativo: true }, true).ativo, true);
});
test('role real obrigatória, sem fallback por nome ADM ou permissão de funcionário', () => {
  assert.equal(canManageBusiness({ userName: 'ADM', Permissao: ['Funcionario.Criar'] }), false);
  assert.equal(canManageBusiness({ role: 'Administrador' }), true);
  assert.equal(
    canManageBusiness({ 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Administrador'] }),
    true
  );
});
test('cache separado por usuário, empresa e loja; endereço tolera ausências', () => {
  assert.notDeepEqual(businessScope({ sub: 1, empresaId: 1 }), businessScope({ sub: 1, empresaId: 2 }));
  assert.deepEqual(addressLines({ rua: ' Rua A ', cidade: 'Cidade', uf: 'TO' }), ['Rua A', 'Cidade - TO']);
  assert.deepEqual(addressLines({ rua: null, uf: '' }), []);
});
test('erros conhecidos não expõem resposta interna', () => {
  for (const status of [400, 401, 403, 404, 409, 422, 500])
    assert.ok(!businessError({ status, message: 'stacktrace-secret' }).includes('secret'));
});

// Regressão de máscara progressiva: o hífen só aparece depois das doze posições da base.
test('máscara progressiva não desloca caracteres durante digitação', () => {
  const cases = [
    '',
    '1',
    '12',
    '12.A',
    '12.AB',
    '12.ABC',
    '12.ABC.3',
    '12.ABC.34',
    '12.ABC.345',
    '12.ABC.345/0',
    '12.ABC.345/01',
    '12.ABC.345/01D',
    '12.ABC.345/01DE',
    '12.ABC.345/01DE-3',
    '12.ABC.345/01DE-35'
  ];
  for (let i = 0; i < cases.length; i++) {
    assert.equal(formatCnpj('12abc34501de35'.slice(0, i)), cases[i]);
    assert.equal(formatCnpj(cases[i]), cases[i]);
  }
  assert.equal(validateLoja({ ...form, documento: '12ABC34501DEAA' }), 'CNPJ inválido.');
  assert.equal(validateLoja({ ...form, documento: '12ABC34501DE350' }), 'CNPJ inválido.');
  assert.equal(validateLoja({ ...form, documento: '12ABC34501DE34' }), 'CNPJ inválido.');
});
