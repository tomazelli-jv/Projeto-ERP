// Metadados compartilhados por formulário e consulta; não são catálogos ou cálculos fiscais.
export const fiscalSections = [
  [
    'Classificação fiscal',
    [
      ['cest', 'CEST'],
      ['origin', 'Origem da mercadoria'],
      ['cfop', 'CFOP padrão']
    ]
  ],
  [
    'ICMS',
    [
      ['icmsCst', 'CST / CSOSN'],
      ['icmsRate', 'Alíquota ICMS', '%'],
      ['baseReduction', 'Redução de base', '%'],
      ['mva', 'MVA', '%'],
      ['fcp', 'FCP', '%']
    ]
  ],
  [
    'PIS / COFINS',
    [
      ['pisCst', 'CST PIS'],
      ['pisRate', 'Alíquota PIS', '%'],
      ['cofinsCst', 'CST COFINS'],
      ['cofinsRate', 'Alíquota COFINS', '%']
    ]
  ],
  [
    'IPI',
    [
      ['ipiCst', 'CST IPI'],
      ['ipiRate', 'Alíquota IPI', '%']
    ]
  ],
  [
    'Reforma tributária',
    [
      ['ibsCbsCst', 'CST IBS/CBS'],
      ['cClassTrib', 'Classificação tributária / cClassTrib'],
      ['ibsStateRate', 'Alíquota IBS estadual', '%'],
      ['ibsCityRate', 'Alíquota IBS municipal', '%'],
      ['cbsRate', 'Alíquota CBS', '%'],
      ['isRate', 'Alíquota IS', '%'],
      ['taxBenefit', 'Código de benefício tributário'],
      ['reformReduction', 'Redução de alíquota', '%'],
      ['reformNotes', 'Observação fiscal da reforma']
    ]
  ]
];
export const fiscalFields = fiscalSections.flatMap(([, fields]) => fields);
export const productSteps = ['Dados gerais', 'Tributação', 'Estoque', 'Precificação'];
// Compara quantidades em milésimos inteiros, sem arredondar entradas inválidas.
export function quantityUnits(value) {
  const text = String(value ?? '');
  if (!/^\d{1,9}(?:[.,]\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}
export function percentValid(value) {
  if (value === '' || value == null) return true;
  const units = quantityUnits(value);
  return units !== null && units <= 100000;
}
