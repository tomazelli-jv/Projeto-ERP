import test from 'node:test';
import assert from 'node:assert/strict';
import { employeeAccess, hasPermission } from '../apps/web/src/app/auth/permissions.js';
import {
  employeePage,
  employeeRecord,
  employeePayload,
  validateEmployee,
  employeeScope,
  retainEmployeeQuery,
  employeeError
} from '../apps/web/src/api/employees-contract.js';

// Fixtures de fronteira, sem credenciais reais ou dependência do banco.
const record = {
  id: 1,
  nome: 'Teste',
  userName: 'teste',
  email: 'teste@example.invalid',
  ativo: true,
  idVinculosLoja: [99]
};
test('permissões string/array; role e username nunca concedem acesso', () => {
  assert.equal(hasPermission({ Permissao: 'Funcionario.Visualizar' }, 'Funcionario.Visualizar'), true);
  assert.equal(hasPermission({ Permissao: ['Funcionario.Criar'] }, 'Funcionario.Criar'), true);
  assert.deepEqual(employeeAccess({ role: 'Administrador', name: 'ADM' }, 'authenticated'), {
    view: false,
    create: false,
    update: false
  });
  assert.equal(employeeAccess({ Permissao: 'Funcionario.Visualizar' }, 'unauthenticated').view, false);
});
test('lista normaliza tamanho ausente sem inventar total; vazio é válido', () => {
  const result = employeePage({ itens: [record], totalRegistros: 25, pagina: 2, tamanhoPagina: 0 }, 20);
  assert.equal(result.tamanhoPagina, 20);
  assert.equal(result.pageSizeFallback, true);
  assert.equal(result.totalRegistros, 25);
  assert.deepEqual(result.itens[0].idVinculosLoja, [99]);
  assert.deepEqual(
    employeePage({ itens: [], totalRegistros: 0, pagina: 1, tamanhoPagina: 10 }, 10).itens,
    []
  );
  assert.throws(() => employeePage({ itens: [], pagina: 1 }, 20));
  assert.throws(() => employeeRecord(null));
  assert.throws(() => employeeRecord({ ...record, ativo: undefined }));
});
test('payload criação usa contrato oficial e edição exclui senha/tipo/loja', () => {
  const form = { ...record, senha: 'fixture-only', tipoUsuario: '2', idLoja: '4', password: 'legacy' };
  assert.deepEqual(
    Object.keys(employeePayload(form, true)).sort(),
    ['email', 'idLoja', 'nome', 'senha', 'tipoUsuario', 'userName'].sort()
  );
  assert.deepEqual(employeePayload(form), {
    nome: record.nome,
    userName: record.userName,
    email: record.email,
    ativo: true
  });
  assert.equal(employeePayload(form, true).idLoja, 4);
});
test('validação create exige loja real e tipo; edição não requer senha', () => {
  const form = { ...record, senha: '', tipoUsuario: '', idLoja: '' };
  assert.deepEqual(validateEmployee(form), {});
  assert.deepEqual(Object.keys(validateEmployee(form, true)).sort(), ['idLoja', 'senha', 'tipoUsuario']);
  assert.deepEqual(
    validateEmployee({ ...form, senha: 'fixture', tipoUsuario: 2, idLoja: 4 }, true, [{ id: '4' }]),
    {}
  );
  assert.ok(validateEmployee({ ...form, email: 'invalid' }).email);
});
test('cache persiste somente na mesma sessão/empresa e com permissão de visualizar', () => {
  const claims = {
    sub: 'one',
    sid: 'session',
    empresaId: 1,
    lojaId: 10,
    Permissao: 'Funcionario.Visualizar'
  };
  const key = [...employeeScope(claims), 'list', { page: 1, pageSize: 20, search: '' }];
  assert.equal(retainEmployeeQuery(key, claims, { ...claims, lojaId: 20 }), true);
  for (const change of [{ empresaId: 2 }, { sid: 'other' }, { sub: 'other' }, { Permissao: [] }])
    assert.equal(retainEmployeeQuery(key, claims, { ...claims, ...change }), false);
  assert.equal(retainEmployeeQuery(['sales'], claims, claims), false);
});
test('erros conhecidos não exibem detalhes internos de servidor', () => {
  for (const status of [400, 401, 403, 404, 409, 500]) assert.ok(employeeError({ status }));
  assert.ok(!employeeError({ status: 500, message: 'sensitive internal information' }).includes('sensitive'));
});
