import { apiRequest } from './client.js';
import { employeePage, employeePayload, employeeRecord } from './employees-contract.js';

// Todas as operações usam o cliente central: JWT em memória, cookie e retry existentes.
export async function listEmployees({ page, pageSize, search }, signal) {
  const query = new URLSearchParams({ pagina: String(page), tamanhoPagina: String(pageSize), busca: search });
  return employeePage(await apiRequest(`/Funcionario/paginado?${query}`, { signal }), pageSize);
}

export async function getEmployee(id, signal) {
  const employee = employeeRecord(await apiRequest(`/Funcionario/${encodeURIComponent(id)}`, { signal }));
  if (String(employee.id) !== String(id))
    throw new Error('Funcionário retornado não corresponde à consulta.');
  return employee;
}

// Não há DELETE, gestão de permissões ou alteração de vínculos neste módulo.
export async function saveEmployee(id, form) {
  const employee = employeeRecord(
    await apiRequest(id == null ? '/Funcionario' : `/Funcionario/${encodeURIComponent(id)}`, {
      method: id == null ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeePayload(form, id == null))
    })
  );
  if (id != null && String(employee.id) !== String(id))
    throw new Error('Resposta de atualização inconsistente.');
  return employee;
}
