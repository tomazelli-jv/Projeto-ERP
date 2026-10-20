import { createMockLookupRepository, normalizeLookupName } from '../catalog-lookups/mockLookupRepository.js';

/** @typedef {{id:string,code:string,abbreviation:string,description:string,active:boolean,createdAt:string,updatedAt:string}} UnitOfMeasure */
export const normalizeAbbreviation = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase();
// Validação acompanha o formato de unidade já aceito pelo catálogo; não remove caracteres silenciosamente.
export function prepareUnit(input) {
  const abbreviation = normalizeAbbreviation(input.abbreviation);
  const description = String(input.description ?? '').trim();
  if (!abbreviation) throw Error('Informe a sigla da unidade.');
  if (!/^[A-Z0-9]{1,10}$/.test(abbreviation)) throw Error('A sigla deve conter de 1 a 10 letras ou números.');
  if (!description) throw Error('Informe a descrição da unidade.');
  if (description.length > 150) throw Error('A descrição deve ter até 150 caracteres.');
  if (input.active !== undefined && typeof input.active !== 'boolean') throw Error('Status inválido.');
  return { abbreviation, description, active: input.active ?? true };
}
// Registros locais de desenvolvimento. SERV preserva a sugestão já utilizada pelos serviços.
export const unitFixtures = () =>
  [
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
    ['H', 'Hora'],
    ['SERV', 'Serviço']
  ].map(([abbreviation, description], index) => ({
    id: `dev-unit-${abbreviation}`,
    code: String(index + 1).padStart(4, '0'),
    abbreviation,
    description,
    active: true,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  }));
export function createMockUnitsRepository(options = {}) {
  return createMockLookupRepository({
    seed: unitFixtures,
    ...options,
    key: options.key ?? 'erp.dev.units.v1',
    identityKey: 'abbreviation',
    prepareRecord: prepareUnit,
    fields: ['abbreviation', 'description'],
    normalizeSearch: normalizeLookupName,
    messages: {
      read: 'Não foi possível ler as unidades locais. Os dados foram preservados.',
      write: 'Não foi possível salvar as unidades no armazenamento local.',
      duplicate: 'Já existe uma unidade de medida com esta sigla.',
      missing: 'Unidade de medida não encontrada.'
    }
  });
}

// Reconfere o vínculo ao salvar, inclusive após inativação em outra aba. Legados permanecem legíveis.
export async function resolveProductUnit(repository, data, initial) {
  const current = data.unitId
    ? await repository.getById(data.unitId)
    : (await repository.list({ field: 'abbreviation', match: 'equals', search: data.unit })).items.find(
        (row) => row.abbreviation === normalizeAbbreviation(data.unit)
      );
  const preserved =
    initial &&
    (initial.unitId
      ? initial.unitId === data.unitId
      : !data.unitId && normalizeAbbreviation(initial.unit) === normalizeAbbreviation(data.unit));
  if ((!current || !current.active) && !preserved && (data.unit || data.type === 'PRODUCT'))
    throw Error('Selecione uma unidade ativa para o novo vínculo.');
  return current ? { ...data, unit: current.abbreviation, unitId: current.id } : data;
}
