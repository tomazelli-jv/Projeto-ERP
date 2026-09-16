// O JWT do Identity pode representar roles como string ou array; não deriva privilégios de nomes.
export function isAdministrator(claims) {
  const roles =
    claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? claims?.role ?? [];
  return (Array.isArray(roles) ? roles : [roles]).includes('Administrador');
}
