// A claim oficial pode ser escalar ou array. Role ou nome do usuário não concede permissão.
export function hasPermission(claims, permission) {
  const values = claims?.Permissao;
  return (Array.isArray(values) ? values : [values]).includes(permission);
}

export function employeeAccess(claims, status) {
  const authenticated = status === 'authenticated';
  return {
    view: authenticated && hasPermission(claims, 'Funcionario.Visualizar'),
    create: authenticated && hasPermission(claims, 'Funcionario.Criar'),
    update: authenticated && hasPermission(claims, 'Funcionario.Atualizar')
  };
}
