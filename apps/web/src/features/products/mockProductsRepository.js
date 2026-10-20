import { validMoney } from '../../components/business/money.js';
import { validNewPrice } from './repricing.js';
import { emptyProduct, normalizeProduct, validateProduct } from './product-model.js';
// Fixtures de catálogo explicitamente DEV; preços não representam operação real.
export const productFixtures = () =>
  [
    {
      id: 'demo-product-1',
      name: 'Refrigerante demonstração 2L',
      code: '0001',
      category: 'Bebidas',
      priceCents: 950,
      gtin: '00012345678905'
    },
    {
      id: 'demo-product-2',
      name: 'Óleo de motor demonstração',
      code: '0002',
      category: 'Peças',
      priceCents: 3500,
      status: 'INACTIVE'
    },
    { id: 'demo-product-3', name: 'Shampoo demonstração', code: '0003', category: 'Geral', priceCents: 1890 },
    {
      id: 'demo-service-1',
      type: 'SERVICE',
      name: 'Corte de cabelo demonstração',
      code: 'S001',
      category: 'Serviços',
      priceCents: 4500,
      unit: 'SERV',
      durationMinutes: '30'
    },
    {
      id: 'demo-service-2',
      type: 'SERVICE',
      name: 'Troca de óleo demonstração',
      code: 'S002',
      category: 'Serviços',
      priceCents: 5000,
      unit: 'H',
      status: 'INACTIVE'
    }
  ].map((item) => ({
    ...normalizeProduct({ ...emptyProduct(), ...item }),
    id: item.id,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  }));
const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
/** Repository de catálogo sem HTTP; validações e filtros fora da UI.
 * @returns {import('./product-types.js').ProductsRepository}
 */
export function createMockProductsRepository({
  storage,
  key = 'erp.dev.products.v1',
  seed = productFixtures,
  now = () => new Date().toISOString(),
  id = () => crypto.randomUUID()
} = {}) {
  let memory;
  function read() {
    try {
      const value = storage?.getItem(key);
      if (value != null) {
        const rows = JSON.parse(value);
        if (
          !Array.isArray(rows) ||
          rows.some((row) => !row || typeof row.id !== 'string' || validateProduct(row))
        )
          throw Error();
        return rows;
      }
      return structuredClone(memory ?? seed());
    } catch {
      throw Error('Não foi possível ler os itens de demonstração armazenados neste navegador.');
    }
  }
  function write(rows) {
    try {
      storage?.setItem(key, JSON.stringify(rows));
    } catch {
      throw Error('Não foi possível salvar os itens no armazenamento local.');
    }
    memory = structuredClone(rows);
  }
  function prepare(data, rows, except) {
    const error = validateProduct(data);
    if (error) throw Error(error);
    const item = normalizeProduct(data);
    if (
      rows.some((row) => row.id !== except && row.code.toLocaleUpperCase() === item.code.toLocaleUpperCase())
    )
      throw Error('Já existe um item com este código interno.');
    return item;
  }
  // Todas as escritas compartilham o lock por escopo entre abas; o lote valida antes de gravar.
  const mutate = (operation) =>
    globalThis.window?.navigator?.locks
      ? window.navigator.locks.request(key, operation)
      : Promise.resolve().then(operation);
  return {
    async list(filters = {}) {
      const rows = read().filter(
        (item) =>
          (!filters.type || item.type === filters.type) &&
          (!filters.status || item.status === filters.status) &&
          (!filters.category || item.category === filters.category) &&
          (!filters.unit || item.unit === filters.unit) &&
          (!filters.groupId ||
            item.groupId === filters.groupId ||
            (!item.groupId && item.category === filters.groupName)) &&
          (!filters.brandId ||
            item.brandId === filters.brandId ||
            (!item.brandId && item.brand === filters.brandName)) &&
          (!filters.search ||
            (['name', 'code', 'gtin'].includes(filters.searchField)
              ? [item[filters.searchField]]
              : [item.name, item.code, item.gtin, item.category]
            ).some((value) => fold(value).includes(fold(filters.search).trim())))
      );
      const total = rows.length;
      const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize) || 10));
      const page = Math.min(Math.max(1, Number(filters.page) || 1), Math.max(1, Math.ceil(total / pageSize)));
      return {
        items: structuredClone(rows.slice((page - 1) * pageSize, page * pageSize)),
        total,
        page,
        pageSize
      };
    },
    // O lote inteiro falha em conflito/validação: nenhuma gravação parcial.
    async updatePrices(changes) {
      return mutate(() => {
        if (!Array.isArray(changes) || !changes.length)
          throw Error('Selecione pelo menos um produto com alteração.');
        const rows = read();
        const ids = new Set();
        const changed = [];
        for (const change of changes) {
          if (ids.has(change.productId)) throw Error('Produto repetido na remarcação.');
          ids.add(change.productId);
          const item = rows.find((row) => row.id === change.productId);
          if (!item || item.type !== 'PRODUCT' || item.status !== 'ACTIVE')
            throw Error('Produto indisponível ou inativo. Atualize a remarcação.');
          if (!validMoney(change.previousPriceCents) || item.priceCents !== change.previousPriceCents)
            throw Error(
              'O preço deste produto foi alterado depois da geração da prévia. Atualize a remarcação antes de continuar.'
            );
          if (!validNewPrice(change.newPriceCents))
            throw Error('O novo preço deve ser maior que zero e respeitar o limite monetário.');
          if (item.priceCents !== change.newPriceCents) {
            item.priceCents = change.newPriceCents;
            item.updatedAt = now();
            changed.push(item);
          }
        }
        if (changed.length) write(rows);
        return structuredClone(changed);
      });
    },
    async summary() {
      const rows = read();
      return {
        total: rows.length,
        products: rows.filter((row) => row.type === 'PRODUCT').length,
        services: rows.filter((row) => row.type === 'SERVICE').length,
        active: rows.filter((row) => row.status === 'ACTIVE').length
      };
    },
    async getById(id) {
      return structuredClone(read().find((row) => row.id === id) ?? null);
    },
    async create(data) {
      return mutate(() => {
        const rows = read();
        const item = { ...prepare(data, rows), id: id(), createdAt: now(), updatedAt: now() };
        write([...rows, item]);
        return structuredClone(item);
      });
    },
    async update(id, data) {
      return mutate(() => {
        const rows = read();
        const index = rows.findIndex((row) => row.id === id);
        if (index < 0) throw Error('Item não encontrado.');
        if (rows[index].type === 'PRODUCT' && data.type === 'SERVICE' && rows[index].initialStock)
          throw Error(
            'Um produto com saldo inicial registrado não pode ser convertido em serviço. Preserve o registro de estoque.'
          );
        // Quantidade de abertura e loja não podem ser reescritas como ajuste de saldo.
        const item = {
          ...prepare(
            {
              ...data,
              initialStock: rows[index].initialStock,
              stockStoreId: rows[index].stockStoreId || data.stockStoreId
            },
            rows,
            id
          ),
          id,
          createdAt: rows[index].createdAt,
          updatedAt: now()
        };
        rows[index] = item;
        write(rows);
        return structuredClone(item);
      });
    },
    async setActive(id, active) {
      return mutate(() => {
        const rows = read();
        const item = rows.find((row) => row.id === id);
        if (!item) throw Error('Item não encontrado.');
        item.status = active ? 'ACTIVE' : 'INACTIVE';
        item.updatedAt = now();
        write(rows);
        return structuredClone(item);
      });
    }
  };
}
