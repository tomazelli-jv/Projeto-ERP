// Catálogo exclusivamente DEV, substituível por um adapter HTTP quando o contrato existir.
const methods = [
  ['cash', 'Dinheiro'],
  ['pix', 'PIX'],
  ['debit', 'Cartão de Débito'],
  ['credit', 'Cartão de Crédito'],
  ['transfer', 'Transferência'],
  ['boleto', 'Boleto']
].map(([id, name]) => ({ id, name }));
export const paymentMethodsRepository = {
  async list() {
    return structuredClone(methods);
  }
};
