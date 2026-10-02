// Destinos só são ativados quando o frontend realmente suporta a rota e seus filtros.
// Não permite URLs externas, JavaScript, caminhos relativos ou parâmetros silenciosamente ignorados.
export function notificationDestination(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return null;
  const url = new URL(value, 'https://erp.invalid');
  if (url.origin !== 'https://erp.invalid' || url.hash) return null;
  if (
    url.pathname === '/financial/receivables' &&
    [...url.searchParams.keys()].every((key) => key === 'status') &&
    url.searchParams.getAll('status').length === 1 &&
    ['OPEN', 'PARTIAL', 'OVERDUE', 'PAID', 'CANCELED'].includes(url.searchParams.get('status'))
  )
    return url.pathname + url.search;
  return null;
}
export const notificationCategories = {
  all: 'Todos',
  products: 'Produtos',
  inventory: 'Estoque',
  financial: 'Financeiro',
  sales: 'Vendas',
  fiscal: 'Fiscal',
  system: 'Sistema',
  security: 'Segurança'
};
export const notificationSeverities = {
  critical: { label: 'Crítico', color: 'error' },
  warning: { label: 'Atenção', color: 'warning' },
  success: { label: 'Sucesso', color: 'success' },
  info: { label: 'Informação', color: 'info' }
};
export function filterNotificationTopics(topics, category, state) {
  return topics.filter(
    (topic) =>
      (category === 'all' || topic.category === category) &&
      (state !== 'unseen' || topic.unseen) &&
      (state !== 'critical' || topic.severity === 'critical')
  );
}
