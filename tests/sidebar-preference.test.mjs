import assert from 'node:assert/strict';
import test from 'node:test';
import { readSidebarPreference } from '../apps/web/src/app/useSidebarPreference.js';

// Exercita leitura sem browser, valores corrompidos e bloqueio de storage sem tocar auth.
test('sidebar inicia expandida sem browser', () => {
  assert.equal(readSidebarPreference(), false);
});

test('somente true persistido recolhe; storage bloqueado não quebra renderização', () => {
  const previous = globalThis.window;
  try {
    for (const value of [null, '', 'false', 'invalid', 'true']) {
      globalThis.window = { localStorage: { getItem: () => value } };
      assert.equal(readSidebarPreference(), value === 'true');
    }
    globalThis.window = {
      get localStorage() {
        throw new Error('blocked');
      }
    };
    assert.equal(readSidebarPreference(), false);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
