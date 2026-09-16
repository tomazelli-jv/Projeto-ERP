import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdministrator } from '../apps/web/src/app/auth/roles.js';
import { normalizeCnpj, validateCnpj } from '../apps/web/src/components/business/business-formatters.js';

// Testes sem dependências novas: o administrador global não precisa de contexto operacional.
test('Administrador sem empresa é reconhecido nas representações reais de role', () => {
  assert.equal(isAdministrator({ role: 'Administrador' }), true);
  assert.equal(isAdministrator({ role: ['Vendedor', 'Administrador'], empresaId: null }), true);
  assert.equal(
    isAdministrator({ 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Administrador' }),
    true
  );
  assert.equal(
    isAdministrator({ 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Administrador'] }),
    true
  );
});
test('nome ADM, email e permissões não concedem role administrativa', () => {
  for (const claims of [
    null,
    {},
    { userName: 'ADM' },
    { email: 'adm@sistema.local' },
    { Permissao: 'Administrador' },
    { role: 'Vendedor' }
  ]) {
    assert.equal(isAdministrator(claims), false);
  }
});
test('claim URI tem precedência sobre fallback role', () => {
  assert.equal(
    isAdministrator({
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Vendedor',
      role: 'Administrador'
    }),
    false
  );
});
// Exercita o helper reaproveitado sem converter documento para número nem eliminar letras.
test('CNPJ aceita legado, letras, máscara e lowercase', () => {
  assert.equal(normalizeCnpj(' 12.abc.345/01de-35 '), '12ABC34501DE35');
  assert.equal(validateCnpj('12.ABC.345/01DE-35'), true);
  assert.equal(validateCnpj('11.222.333/0001-81'), true);
});
test('CNPJ rejeita símbolo desconhecido, tamanho e dígitos verificadores inválidos', () => {
  assert.equal(normalizeCnpj('12@ABC34501DE35'), null);
  for (const value of ['123', '12ABC34501DE36', '12ABC34501DEAA', '00000000000000'])
    assert.equal(validateCnpj(value), false);
});
