import { emptyCustomer, normalizeCustomer, validateCustomer } from './customer-model.js';

// Fixtures exclusivamente demonstrativas, sem pessoas reais. Datas/documentos são exemplos de teste.
export function customerFixtures() {
  return [
    {
      id: 'demo-pf-1',
      type: 'PERSON',
      name: 'Cliente Demonstração A',
      document: '52998224725',
      status: 'ACTIVE',
      city: 'São Paulo',
      state: 'SP'
    },
    {
      id: 'demo-pf-2',
      type: 'PERSON',
      name: 'Cliente Demonstração B',
      document: '11144477735',
      status: 'INACTIVE',
      city: 'Curitiba',
      state: 'PR'
    },
    {
      id: 'demo-pj-1',
      type: 'COMPANY',
      legalName: 'Empresa Demonstração Alfa',
      tradeName: 'Demonstração Alfa',
      document: '12ABC34501DE35',
      status: 'ACTIVE',
      city: 'Palmas',
      state: 'TO'
    },
    {
      id: 'demo-pj-2',
      type: 'COMPANY',
      legalName: 'Empresa Demonstração Beta',
      document: '11222333000181',
      status: 'INACTIVE',
      city: 'Curitiba',
      state: 'PR'
    }
  ].map(({ city, state, ...record }, index) => ({
    ...emptyCustomer(),
    ...record,
    email: `demo${index + 1}@example.invalid`,
    address: { ...emptyCustomer().address, city, state },
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  }));
}
const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const compact = (value) => fold(value).replace(/[.\s/()+-]/g, '');
/** DEV repository sem HTTP. Storage injetável permite testes e substituição por API.
 * @returns {import('./customer-types.js').CustomersRepository}
 */
export function createMockCustomersRepository({
  storage,
  key = 'erp.dev.customers.v1',
  seed = customerFixtures,
  now = () => new Date().toISOString(),
  id = () => crypto.randomUUID()
} = {}) {
  let memory;
  function read() {
    try {
      const saved = storage?.getItem(key);
      if (saved !== null && saved !== undefined) {
        const records = JSON.parse(saved);
        if (
          !Array.isArray(records) ||
          records.some((r) => !r || typeof r.id !== 'string' || !r.address || validateCustomer(r))
        )
          throw Error();
        return records;
      }
      return structuredClone(memory ?? seed());
    } catch {
      throw Error('Não foi possível ler os clientes de demonstração armazenados neste navegador.');
    }
  }
  function write(records) {
    try {
      storage?.setItem(key, JSON.stringify(records));
    } catch {
      throw Error(
        'Não foi possível salvar no armazenamento local. Verifique o espaço e as permissões do navegador.'
      );
    }
    memory = structuredClone(records);
  }
  function prepare(input, records, except) {
    const error = validateCustomer(input);
    if (error) throw Error(error);
    const data = normalizeCustomer(input);
    if (records.some((c) => c.id !== except && c.document === data.document))
      throw Error('Já existe um cliente com este documento.');
    return data;
  }
  return {
    async list(filters = {}) {
      const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize) || 10));
      const search = fold(filters.search).trim();
      const items = read().filter(
        (c) =>
          (!filters.type || c.type === filters.type) &&
          (!filters.status || c.status === filters.status) &&
          (!filters.city || fold(c.address.city).includes(fold(filters.city))) &&
          (!filters.state || c.address.state === filters.state) &&
          (!search ||
            [c.name, c.legalName, c.tradeName, c.email].some((value) => fold(value).includes(search)) ||
            [c.document, c.phone, c.mobile].some(
              (value) => compact(value).includes(compact(search)) && compact(search)
            ))
      );
      const total = items.length;
      const page = Math.min(Math.max(1, Number(filters.page) || 1), Math.max(1, Math.ceil(total / pageSize)));
      return {
        items: structuredClone(items.slice((page - 1) * pageSize, page * pageSize)),
        total,
        page,
        pageSize
      };
    },
    async summary() {
      const rows = read();
      return {
        total: rows.length,
        active: rows.filter((c) => c.status === 'ACTIVE').length,
        persons: rows.filter((c) => c.type === 'PERSON').length,
        companies: rows.filter((c) => c.type === 'COMPANY').length
      };
    },
    async getById(id) {
      return structuredClone(read().find((c) => c.id === id) ?? null);
    },
    async create(input) {
      const rows = read();
      const data = prepare(input, rows);
      const timestamp = now();
      const record = { ...data, id: id(), createdAt: timestamp, updatedAt: timestamp };
      write([...rows, record]);
      return structuredClone(record);
    },
    async update(id, input) {
      const rows = read();
      const index = rows.findIndex((c) => c.id === id);
      if (index < 0) throw Error('Cliente não encontrado.');
      const data = prepare(input, rows, id);
      rows[index] = { ...rows[index], ...data, updatedAt: now() };
      write(rows);
      return structuredClone(rows[index]);
    },
    async setActive(id, active) {
      const rows = read();
      const record = rows.find((c) => c.id === id);
      if (!record) throw Error('Cliente não encontrado.');
      record.status = active ? 'ACTIVE' : 'INACTIVE';
      record.updatedAt = now();
      write(rows);
      return structuredClone(record);
    }
  };
}
