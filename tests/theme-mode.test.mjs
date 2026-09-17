import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeThemeMode, readThemeMode } from '../apps/web/src/app/theme-mode.js';

test('preferência aceita somente light, dark e system', () => {
  for (const mode of ['light', 'dark', 'system']) assert.equal(normalizeThemeMode(mode), mode);
  for (const value of [null, undefined, '', 'auto', 'DARK'])
    assert.equal(normalizeThemeMode(value), 'system');
});

test('sem browser ou storage disponível, preferência padrão é system', () => {
  assert.equal(readThemeMode(), 'system');
});
