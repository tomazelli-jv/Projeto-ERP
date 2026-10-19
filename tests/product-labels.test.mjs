import test from 'node:test';
import assert from 'node:assert/strict';
import { LABEL_MODEL, buildLabels, labelQuantity, labelSheets, labelTotals, labelCss, labelPreviewCss } from '../apps/web/src/features/product-labels/label-model.js';
import { createMockProductsRepository, productFixtures } from '../apps/web/src/features/products/mockProductsRepository.js';

// Contratos de quantidades, prévia limitada e paginação de impressão, sem impressora real.
test('quantidades inteiras positivas e limite explícito', () => {
  for (const input of ['', '0', '-1', '1.5', '1,5', '1e2', 'a', '1001']) assert.equal(labelQuantity(input), null);
  assert.equal(labelQuantity('1'), 1);
  assert.equal(labelQuantity('1000'), 1000);
  assert.deepEqual(labelTotals({ a: '2', b: '3' }), { products: 2, total: 5, valid: true });
  assert.equal(labelTotals({}).valid, false);
  assert.equal(labelTotals({ a: '600', b: '600' }).valid, false);
});
test('prévia repete etiquetas, preserva GTIN e não fabrica barcode ausente', () => {
  const products = productFixtures();
  const labels = buildLabels(products, { 'demo-product-1': '2', 'demo-product-3': '3' });
  assert.equal(labels.length, 5);
  assert.equal(new Set(labels.map((row) => row.key)).size, 5);
  assert.equal(labels[0].product.gtin, '00012345678905');
  assert.equal(labels[4].product.gtin, '');
  assert.equal(buildLabels(products, { 'demo-product-1': '30' }, LABEL_MODEL.previewLimit).length, 20);
  assert.throws(() => buildLabels(products, { 'demo-product-2': '1' }), /inativo/);
  assert.throws(() => buildLabels(products, { 'demo-service-1': '1' }));
  assert.throws(() => buildLabels(products, { absent: '1' }));
});
test('preço remarcado vem do mesmo repository; etiquetas não persistem', async () => {
  const repo = createMockProductsRepository();
  await repo.updatePrices([{ productId: 'demo-product-1', previousPriceCents: 950, newPriceCents: 1049 }]);
  const products = (await repo.list()).items;
  assert.equal(buildLabels(products, { 'demo-product-1': '2' })[0].product.priceCents, 1049);
  assert.equal((await repo.getById('demo-product-1')).priceCents, 1049);
});
test('folhas completas, sem perder etiquetas nem ultrapassar A4', () => {
  const sheets = labelSheets(buildLabels(productFixtures(), { 'demo-product-1': '43' }));
  assert.deepEqual(sheets.map((page) => page.length), [21, 21, 1]);
  assert.ok(LABEL_MODEL.columns * LABEL_MODEL.width + (LABEL_MODEL.columns - 1) * LABEL_MODEL.gap <= 210 - 2 * LABEL_MODEL.margin);
  assert.ok(LABEL_MODEL.rows * LABEL_MODEL.height + (LABEL_MODEL.rows - 1) * LABEL_MODEL.gap <= 297 - 2 * LABEL_MODEL.margin);
  assert.ok(labelCss.includes('break-inside:avoid'));
  assert.ok(labelCss.includes('@media print'));
  assert.ok(!labelPreviewCss.includes('@page'));
  assert.ok(!labelPreviewCss.includes('@media print'));
});
