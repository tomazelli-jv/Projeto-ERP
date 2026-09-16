import { apiRequest } from './client.js';
import { normalizeCnpj } from '../components/business/business-formatters.js';

// DTOs oficiais não usam envelope data; a conferência local não substitui autorização no servidor.
function scoped(record, empresaId, company = false) {
  if (!record || String(company ? record.id : record.empresaId) !== String(empresaId))
    throw new Error('O cadastro retornado não pertence à empresa da sessão.');
  return record;
}
// Alias exclusivamente visual para reutilizar componentes sem inventar coluna no backend.
const normalizeLoja = (loja) => ({ ...loja, nomeFantasia: loja.nome });
// Administração global usa a listagem real, independentemente de empresaId no JWT.
export async function listEmpresas() {
  const result = await apiRequest('/Empresa');
  if (!Array.isArray(result)) throw new Error('Resposta de empresas inválida.');
  return result;
}
export async function createEmpresa(body) {
  const result = await write('/Empresa', 'POST', { nome: body.nome.trim() });
  if (!result?.id)
    throw new Error(
      'Cadastro enviado, mas a resposta não identificou a empresa. Atualize a lista antes de tentar novamente.'
    );
  return result;
}
export async function getEmpresa(empresaId) {
  return scoped(await apiRequest(`/Empresa/${encodeURIComponent(empresaId)}`), empresaId, true);
}
export async function listLojas(empresaId) {
  const lojas = await apiRequest('/Loja');
  if (!Array.isArray(lojas)) throw new Error('Resposta de lojas inválida.');
  return lojas.filter((loja) => String(loja.empresaId) === String(empresaId)).map(normalizeLoja);
}
// Whitelist preserva o vínculo e exclui campos antigos ausentes do DTO oficial.
export function lojaPayload(empresaId, body, editing = false) {
  const documento = body.tipoPessoa === 1 ? body.documento : normalizeCnpj(body.documento);
  if (documento === null) throw new Error('Documento contém caracteres inválidos.');
  return {
    empresaId,
    nome: body.nomeFantasia.trim(),
    razaoSocial: body.razaoSocial || null,
    tipoPessoa: body.tipoPessoa ?? 2,
    documento,
    telefone: body.telefone,
    email: body.email,
    cep: body.cep,
    cidade: body.cidade,
    rua: body.rua,
    uf: body.uf,
    ...(editing ? { ativo: body.ativo } : {})
  };
}
const write = (path, method, body) =>
  apiRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
export async function updateEmpresa(empresaId, body) {
  return scoped(
    await write(`/Empresa/${encodeURIComponent(empresaId)}`, 'PUT', {
      nome: body.nome,
      ativo: body.ativo
    }),
    empresaId,
    true
  );
}
export async function createLoja(empresaId, body) {
  return normalizeLoja(scoped(await write('/Loja', 'POST', lojaPayload(empresaId, body)), empresaId));
}
export async function updateLoja(empresaId, lojaId, body) {
  return normalizeLoja(
    scoped(
      await write(`/Loja/${encodeURIComponent(lojaId)}`, 'PUT', lojaPayload(empresaId, body, true)),
      empresaId
    )
  );
}
