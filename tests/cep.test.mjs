import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCep, normalizeCep, mergeCepAddress } from '../apps/web/src/api/cep.js';
import { formatCep } from '../apps/web/src/components/business/business-formatters.js';
// Mock exclusivo do transporte público; contratos e formulário não são simulados aqui.
test('consulta CEP: normalização, adapter, privacidade e erros', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://viacep.com.br/ws/01001000/json/');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.headers, undefined);
      return {
        ok: true,
        json: async () => ({
          cep: '01001-000',
          logradouro: 'Praça da Sé',
          bairro: 'Sé',
          localidade: 'São Paulo',
          uf: 'sp',
          complemento: 'ignorar',
          ibge: 'ignorar'
        })
      };
    };
    assert.equal(normalizeCep('01.001-000'), '01001000');
    assert.equal(formatCep('01001000'), '01001-000');
    await assert.rejects(lookupCep('01001'), /CEP_INVALID/);
    assert.equal(calls, 0);
    const address = await lookupCep('01001-000');
    assert.deepEqual(address, {
      cep: '01001000',
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP'
    });
    const form = { cep: '01001-000', numero: '152', complemento: 'Sala 1' };
    const merged = mergeCepAddress(form, address, {
      street: 'rua',
      neighborhood: 'bairro',
      city: 'cidade',
      state: 'uf'
    });
    assert.equal(merged.rua, address.street);
    assert.equal(merged.bairro, 'Sé');
    assert.equal(merged.numero, '152');
    assert.equal(merged.complemento, 'Sala 1');
    assert.equal(mergeCepAddress({ ...form, cep: '77804120' }, address, {}).cep, '77804120');
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ erro: true }) });
    await assert.rejects(lookupCep('00000000'), /CEP_NOT_FOUND/);
    globalThis.fetch = async () => {
      throw Error('offline');
    };
    await assert.rejects(lookupCep('01001000'), /offline/);
  } finally {
    globalThis.fetch = original;
  }
});
