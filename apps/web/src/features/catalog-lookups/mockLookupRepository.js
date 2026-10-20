// Persistencia e busca comuns aos cadastros auxiliares DEV; validacao pertence a cada modulo.
export const normalizeLookupName = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');

export function createMockLookupRepository({
  storage,
  key,
  prepareRecord,
  fields,
  normalizeSearch,
  messages,
  identityKey = 'name',
  generateCode = true,
  seed = () => [],
  now = () => new Date().toISOString(),
  id = () => crypto.randomUUID()
} = {}) {
  let memory;
  function read() {
    try {
      const saved = storage?.getItem(key);
      const rows = saved == null ? (memory ?? seed()) : JSON.parse(saved);
      if (
        !Array.isArray(rows) ||
        rows.some(
          (row) =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.code !== 'string' ||
            typeof row.active !== 'boolean' ||
            !prepareRecord(row)
        )
      )
        throw Error();
      return structuredClone(rows);
    } catch {
      throw Error(messages.read);
    }
  }
  function write(rows) {
    try {
      storage?.setItem(key, JSON.stringify(rows));
    } catch {
      throw Error(messages.write);
    }
    memory = structuredClone(rows);
  }
  function prepare(input, rows, except) {
    const data = prepareRecord(input);
    if (
      rows.some(
        (row) =>
          row.id !== except &&
          normalizeLookupName(row[identityKey]) === normalizeLookupName(data[identityKey])
      )
    )
      throw Error(messages.duplicate);
    return data;
  }
  // Serializa alterações entre abas quando Web Locks está disponível; leitura ocorre dentro do lock.
  const mutate = (operation) =>
    globalThis.window?.navigator?.locks
      ? navigator.locks.request(key, operation)
      : Promise.resolve().then(operation);
  return {
    async list({ field = fields[0], match = 'contains', search = '', activeOnly = false } = {}) {
      const normalized = (value) => normalizeSearch(value, field);
      const needle = normalized(search);
      if (needle === null) return { items: [], total: 0 };
      const items = read().filter((row) => {
        if (activeOnly && !row.active) return false;
        const value = normalized(row[fields.includes(field) ? field : fields[0]]);
        return (
          !needle ||
          (match === 'equals'
            ? value === needle
            : match === 'starts'
              ? value.startsWith(needle)
              : value.includes(needle))
        );
      });
      return { items, total: items.length };
    },
    async getById(recordId) {
      return read().find((row) => row.id === recordId) ?? null;
    },
    create(input) {
      return mutate(() => {
        const rows = read();
        const data = prepare(input, rows);
        const timestamp = now();
        const row = {
          ...data,
          id: id(),
          ...(generateCode ? { code: String(rows.length + 1).padStart(4, '0') } : {}),
          createdAt: timestamp,
          updatedAt: timestamp
        };
        write([...rows, row]);
        return row;
      });
    },
    update(recordId, input) {
      return mutate(() => {
        const rows = read();
        const index = rows.findIndex((row) => row.id === recordId);
        if (index < 0) throw Error(messages.missing);
        rows[index] = { ...rows[index], ...prepare(input, rows, recordId), updatedAt: now() };
        write(rows);
        return rows[index];
      });
    },
    setActive(recordId, active) {
      return mutate(() => {
        const rows = read();
        const row = rows.find((item) => item.id === recordId);
        if (!row) throw Error(messages.missing);
        if (typeof active !== 'boolean') throw Error('Status inválido.');
        row.active = active;
        row.updatedAt = now();
        write(rows);
        return row;
      });
    }
  };
}
