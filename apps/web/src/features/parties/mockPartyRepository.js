// Motor compartilhado de paginação/persistência dos mocks DEV; não realiza HTTP.
const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const compact = (value) => fold(value).replace(/[.\s/()+-]/g, '');
/** DEV repository sem HTTP. Storage injetável permite testes e substituição por API.
 * Normalização e validação são injetadas pelo módulo, sem misturar seus registros.
 * A hidratação de leitura permite evoluir os campos sem exigir retroativamente novas obrigatoriedades.
 */
export function createMockPartyRepository({
  storage,
  key,
  seed,
  validate,
  normalize,
  hydrate = (record) => record,
  validateStored = validate,
  singular,
  plural,
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
          records.some((r) => !r || typeof r.id !== 'string' || !r.address || validateStored(r))
        )
          throw Error();
        return records.map(hydrate);
      }
      return structuredClone(memory ?? seed()).map(hydrate);
    } catch {
      throw Error(`Não foi possível ler os ${plural} de demonstração armazenados neste navegador.`);
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
    const error = validate(input);
    if (error) throw Error(error);
    const data = normalize(input);
    if (records.some((c) => c.id !== except && c.document === data.document))
      throw Error(`Já existe um ${singular} com este documento.`);
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
      if (index < 0) throw Error(`${singular[0].toUpperCase() + singular.slice(1)} não encontrado.`);
      const data = prepare(input, rows, id);
      rows[index] = { ...rows[index], ...data, updatedAt: now() };
      write(rows);
      return structuredClone(rows[index]);
    },
    async setActive(id, active) {
      const rows = read();
      const record = rows.find((c) => c.id === id);
      if (!record) throw Error(`${singular[0].toUpperCase() + singular.slice(1)} não encontrado.`);
      record.status = active ? 'ACTIVE' : 'INACTIVE';
      record.updatedAt = now();
      write(rows);
      return structuredClone(record);
    }
  };
}
