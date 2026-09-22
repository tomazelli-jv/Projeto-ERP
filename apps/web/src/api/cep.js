// Cliente público separado do ERP: recebe só CEP, nunca token, cookie ou dados pessoais adicionais.
export const normalizeCep = (value) => String(value ?? '').replace(/\D/g, '');
export async function lookupCep(value, signal) {
  const cep = normalizeCep(value);
  if (!/^\d{8}$/.test(cep)) throw new Error('CEP_INVALID');
  const timeout = AbortSignal.timeout(7000);
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  });
  if (!response.ok) throw new Error('CEP_NETWORK');
  const data = await response.json();
  if (data.erro === true || data.erro === 'true') throw new Error('CEP_NOT_FOUND');
  if (
    normalizeCep(data.cep) !== cep ||
    typeof data.localidade !== 'string' ||
    !/^[a-z]{2}$/i.test(data.uf ?? '')
  )
    throw new Error('CEP_RESPONSE');
  // Adapter descarta complemento do provedor e metadados que não pertencem ao endereço do formulário.
  return {
    cep,
    street: typeof data.logradouro === 'string' ? data.logradouro : '',
    neighborhood: typeof data.bairro === 'string' ? data.bairro : '',
    city: data.localidade,
    state: data.uf.toUpperCase()
  };
}

// Aplica somente campos mapeados pelo consumidor; número/complemento nunca são candidatos.
export function mergeCepAddress(form, address, fields) {
  if (normalizeCep(form.cep) !== address.cep) return form;
  const result = { ...form };
  for (const key of ['street', 'neighborhood', 'city', 'state']) {
    if (fields[key] && address[key]) result[fields[key]] = address[key];
  }
  return result;
}
