import assert from 'node:assert/strict';
import test from 'node:test';
import { mapUser, createUserDto, updateUserDto } from '../apps/web/src/api/user-contract.js';
import {
  userPermissions,
  validateUserForm,
  userInitials
} from '../apps/web/src/components/users/user-model.js';

// Contratos puros não dependem do DOM nem de credenciais; nomes visuais não alteram o payload HTTP.
test('adapter mantém IDs de vínculo separados de IDs de loja', () => {
  const user = mapUser({ id: 7, nome: 'Ana Silva', idVinculosLoja: [90], ativo: true });
  assert.deepEqual(user.vinculoIds, ['90']);
  assert.equal('idLoja' in user, false);
  assert.equal('tipoUsuario' in user, false);
  assert.equal(userInitials(user.nome), 'AS');
  assert.equal(userInitials(null), '?');
});
test('permissões exigem claims específicas, não username ou role master', () => {
  assert.deepEqual(userPermissions({ userName: 'ADM', role: 'Administrador' }), {
    view: false,
    create: false,
    update: false
  });
  assert.deepEqual(userPermissions({ Permissao: ['Funcionario.Visualizar', 'Funcionario.Criar'] }), {
    view: true,
    create: true,
    update: false
  });
  assert.equal(userPermissions({ Permissao: 'Funcionario.Atualizar' }).update, true);
});
const form = {
  nome: ' Ana ',
  userName: ' ana ',
  email: 'ana@example.com',
  senha: 'Example9',
  confirmacao: 'Example9',
  tipoUsuario: '3',
  idLoja: '2',
  ativo: false,
  idEmpresa: 5,
  telefone: 'fake'
};
test('create envia somente o DTO oficial, sem ativo, empresa ou confirmação', () => {
  assert.deepEqual(Object.keys(createUserDto(form)), [
    'nome',
    'userName',
    'email',
    'senha',
    'tipoUsuario',
    'idLoja'
  ]);
  assert.equal(createUserDto(form).idLoja, 2);
  assert.equal(createUserDto(form).nome, 'Ana');
});
test('update nunca envia senha, perfil ou loja', () => {
  assert.deepEqual(updateUserDto(form), {
    nome: 'Ana',
    userName: 'ana',
    email: 'ana@example.com',
    ativo: false
  });
});
test('confirmação e política Identity verificadas só na criação', () => {
  assert.equal(validateUserForm(form, true), '');
  assert.match(validateUserForm({ ...form, confirmacao: 'different' }, true), /coincidem/);
  assert.match(validateUserForm({ ...form, senha: 'lower9', confirmacao: 'lower9' }, true), /maiúscula/);
  assert.equal(validateUserForm({ ...form, senha: '', confirmacao: '' }, false), '');
});
