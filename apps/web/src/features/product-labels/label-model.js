// Modelo único A4: medidas em mm e limites explícitos evitam travar o navegador em lotes enormes.
export const LABEL_MODEL = Object.freeze({
  width: 60,
  height: 35,
  gap: 4,
  margin: 10,
  columns: 3,
  rows: 7,
  previewLimit: 20,
  maxLabels: 1000
});

export function labelQuantity(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity <= LABEL_MODEL.maxLabels ? quantity : null;
}

export function labelTotals(selection) {
  const quantities = Object.values(selection).map(labelQuantity);
  const total = quantities.reduce((sum, value) => sum + (value ?? 0), 0);
  return {
    products: quantities.length,
    total,
    valid:
      quantities.length > 0 && quantities.every((value) => value !== null) && total <= LABEL_MODEL.maxLabels
  };
}

// Expansão temporária somente para apresentação, nunca grava cópias de Produtos.
export function buildLabels(products, selection, limit = LABEL_MODEL.maxLabels) {
  if (!labelTotals(selection).valid)
    throw Error(
      `Informe quantidades inteiras positivas; limite de ${LABEL_MODEL.maxLabels} etiquetas por lote.`
    );
  const byId = new Map(products.map((item) => [item?.id, item]));
  const result = [];
  for (const [id, quantity] of Object.entries(selection)) {
    const product = byId.get(id);
    if (!product || product.type !== 'PRODUCT' || product.status !== 'ACTIVE')
      throw Error('Um produto selecionado está indisponível ou inativo. Revise a seleção.');
    for (let i = 0; i < Number(quantity) && result.length < limit; i++)
      result.push({ key: `${id}:${i}`, product });
  }
  return result;
}

export function labelSheets(labels) {
  const size = LABEL_MODEL.columns * LABEL_MODEL.rows;
  return Array.from({ length: Math.ceil(labels.length / size) }, (_, i) =>
    labels.slice(i * size, (i + 1) * size)
  );
}

// CSS é compartilhado entre prévia e documento de impressão, sem regras globais sobre o ERP.
export const labelCss = `
.product-label { box-sizing:border-box; width:${LABEL_MODEL.width}mm; height:${LABEL_MODEL.height}mm; padding:2mm; border:1px solid #d8d8d8; background:#fff; color:#111; font-family:Arial,sans-serif; overflow:hidden; display:flex; flex-direction:column; gap:1mm; break-inside:avoid; page-break-inside:avoid; }
.product-label-name { font-size:10px; line-height:12px; height:24px; flex-shrink:0; overflow:hidden; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.product-label-price { font-size:21px; line-height:26px; font-weight:700; white-space:nowrap; }
.product-label-price.long-price { font-size:16px; }
.product-label-barcode { font-size:11px; letter-spacing:1px; line-height:13px; }
.product-label-code { font-size:9px; line-height:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:auto; }
.label-sheet { display:grid; grid-template-columns:repeat(${LABEL_MODEL.columns},${LABEL_MODEL.width}mm); grid-auto-rows:${LABEL_MODEL.height}mm; gap:${LABEL_MODEL.gap}mm; align-content:start; width:${LABEL_MODEL.columns * LABEL_MODEL.width + (LABEL_MODEL.columns - 1) * LABEL_MODEL.gap}mm; }
@page { size:A4 portrait; margin:${LABEL_MODEL.margin}mm; }
@media print { html,body { margin:0; padding:0; background:#fff; } .label-sheet { break-after:page; page-break-after:always; } .label-sheet:last-child { break-after:auto; page-break-after:auto; } .product-label { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
`;

// A prévia não injeta @page nem regras de impressão no documento principal do ERP.
export const labelPreviewCss = labelCss.split('@page')[0];
