import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeDevice,
  sessionTimestamp,
  formatSessionDate,
  sortSessions,
  normalizeSessions
} from '../apps/web/src/api/session-formatters.js';

// Fixtures testam apenas apresentação/contrato, sem autenticação fabricada no produto.
test('User-Agent reconhece Edge antes de Chrome; desconhecido não inventa dispositivo', () => {
  assert.equal(describeDevice('Windows Chrome/120 Safari/537 Edg/120'), 'Edge no Windows');
  assert.equal(describeDevice('Linux Firefox/120'), 'Firefox no Linux');
  assert.equal(describeDevice('iPhone Version/17 Safari/600'), 'Safari no iOS');
  assert.equal(describeDevice('Android Chrome/120'), 'Chrome no Android');
  assert.equal(describeDevice(null), 'Dispositivo desconhecido');
  assert.equal(describeDevice('custom-agent'), 'Dispositivo desconhecido');
});
test('UTC com ou sem sufixo e offsets representam o mesmo instante', () => {
  assert.equal(sessionTimestamp('2026-09-16T15:00:00'), sessionTimestamp('2026-09-16T15:00:00Z'));
  assert.equal(sessionTimestamp('2026-09-16T12:00:00-03:00'), sessionTimestamp('2026-09-16T15:00:00Z'));
  assert.equal(formatSessionDate(null), 'Não informada');
  assert.equal(formatSessionDate('invalid'), 'Não informada');
});
test('sessão atual primeiro, demais por último uso, sem mutar cache', () => {
  const items = [
    { id: 'a', current: false, lastUsedAtUtc: '2026-09-15T10:00:00Z' },
    { id: 'b', current: true, lastUsedAtUtc: '2026-09-14T10:00:00Z' },
    { id: 'c', current: false, lastUsedAtUtc: '2026-09-16T10:00:00Z' }
  ];
  assert.deepEqual(
    sortSessions(items).map((s) => s.id),
    ['b', 'c', 'a']
  );
  assert.equal(items[0].id, 'a');
});
test('DTO inválido não vira sessão remota nem lista vazia', () => {
  assert.throws(() => normalizeSessions(null));
  assert.throws(() => normalizeSessions([{ id: 'invalid', atual: false }]));
  assert.throws(() => normalizeSessions([{ id: '11111111-1111-1111-1111-111111111111', atual: 'false' }]));
  assert.deepEqual(normalizeSessions([]), []);
});
