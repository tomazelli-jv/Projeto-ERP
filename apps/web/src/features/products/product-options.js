// Opções demonstrativas centralizadas. A futura fonte remota pode fornecer o mesmo formato.
export const productCategories = ['Geral', 'Bebidas', 'Alimentos', 'Serviços', 'Peças', 'Outros'];
export const units = [
  ['UN', 'Unidade'],
  ['KG', 'Quilograma'],
  ['G', 'Grama'],
  ['L', 'Litro'],
  ['ML', 'Mililitro'],
  ['M', 'Metro'],
  ['M2', 'Metro quadrado'],
  ['M3', 'Metro cúbico'],
  ['CX', 'Caixa'],
  ['PC', 'Peça'],
  ['PCT', 'Pacote'],
  ['SERV', 'Serviço'],
  ['H', 'Hora']
];
export const itemTypeLabel = (type) => (type === 'PRODUCT' ? 'Produto' : 'Serviço');
