import test from 'node:test';
import assert from 'node:assert/strict';
import {
  notificationDestination,
  filterNotificationTopics
} from '../apps/web/src/features/notifications/notifications-model.js';
import { notificationsSource } from '../apps/web/src/features/notifications/notifications-source.js';
// Fixtures somente de teste: nenhum alerta fictício entra na aplicação.
test('destino permite apenas filtro implementado e rejeita redirecionamentos', () => {
  assert.equal(
    notificationDestination('/financial/receivables?status=OVERDUE'),
    '/financial/receivables?status=OVERDUE'
  );
  for (const url of [
    'https://evil.invalid',
    '//evil.invalid',
    'javascript:alert(1)',
    '/products?stock=low',
    '/financial/receivables?status=BAD',
    '/financial/receivables?status=OVERDUE&other=1',
    '/financial/receivables?status=OPEN&status=PAID'
  ])
    assert.equal(notificationDestination(url), null);
});
test('filtros da central trabalham sobre topicos agregados', () => {
  const topics = [
    { category: 'financial', unseen: true, severity: 'critical' },
    { category: 'products', unseen: false, severity: 'warning' }
  ];
  assert.equal(filterNotificationTopics(topics, 'all', 'all').length, 2);
  assert.equal(filterNotificationTopics(topics, 'financial', 'unseen').length, 1);
  assert.equal(filterNotificationTopics(topics, 'products', 'critical').length, 0);
});
test('ausencia de integracao nao representa zero alertas consultados com sucesso', async () => {
  const data = await notificationsSource.summary();
  assert.equal(data.available, false);
  assert.equal(data.unreadTopicCount, 0);
  assert.deepEqual(data.topics, []);
  assert.equal(data.canViewAllStores, false);
  await assert.rejects(notificationsSource.occurrences());
});
