import { apiRequest } from './client.js';

// Este módulo concentra as rotas empresariais para preservar autenticação, refresh e erros do cliente HTTP comum.
export async function listEmpresas() {
  const response = await apiRequest('/empresas');
  return response.data;
}

// A consulta individual fica disponível para futuras telas sem espalhar construção de URLs pelos componentes.
export async function getEmpresa(idEmpresa) {
  const response = await apiRequest(`/empresas/${encodeURIComponent(idEmpresa)}`);
  return response.data;
}

// A lista de lojas sempre parte da empresa acessível, refletindo o escopo aplicado pelo backend.
export async function listLojas(idEmpresa) {
  const response = await apiRequest(`/empresas/${encodeURIComponent(idEmpresa)}/lojas`);
  return response.data;
}

// A consulta individual é encapsulada embora a página atual receba a representação completa da listagem.
export async function getLoja(idLoja) {
  const response = await apiRequest(`/lojas/${encodeURIComponent(idLoja)}`);
  return response.data;
}

// Somente nome e ativo são enviados; id e data de cadastro permanecem imutáveis.
export async function updateEmpresa(idEmpresa, body) {
  const response = await apiRequest(`/empresas/${encodeURIComponent(idEmpresa)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.data;
}

// A criação usa a rota da empresa e deixa o backend criar atomicamente o vínculo do funcionário.
export async function createLoja(idEmpresa, body) {
  const response = await apiRequest(`/empresas/${encodeURIComponent(idEmpresa)}/lojas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.data;
}

// Atualizações de loja nunca enviam id, empresa ou data de cadastro no corpo.
export async function updateLoja(idLoja, body) {
  const response = await apiRequest(`/lojas/${encodeURIComponent(idLoja)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.data;
}
