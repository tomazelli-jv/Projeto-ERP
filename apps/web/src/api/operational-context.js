import { apiRequest } from './client.js';

// Descoberta do contexto exige apenas autenticação e sempre reconstrói vínculos atuais no servidor.
export async function getOperationalContext() {
  const response = await apiRequest('/contexto');
  return response.data;
}
