// Contrato Funcionario: vínculos não são IDs de lojas; nenhuma resposta recebe dados fabricados.
export function employeeRecord(value) {
  if (
    !value ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    typeof value.nome !== 'string' ||
    typeof value.userName !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.ativo !== 'boolean' ||
    !Array.isArray(value.idVinculosLoja) ||
    !value.idVinculosLoja.every((id) => Number.isSafeInteger(id) && id > 0)
  ) {
    throw new Error('Resposta de funcionário ausente ou inválida.');
  }
  return value;
}

// O total sempre vem da API. O fallback de tamanho é explícito para não esconder o bug conhecido.
export function employeePage(value, requestedSize) {
  if (
    !value ||
    !Array.isArray(value.itens) ||
    !Number.isSafeInteger(value.totalRegistros) ||
    value.totalRegistros < 0 ||
    !Number.isSafeInteger(value.pagina) ||
    value.pagina < 1
  ) {
    throw new Error('Resposta de paginação inválida.');
  }
  const invalidSize = !Number.isSafeInteger(value.tamanhoPagina) || value.tamanhoPagina <= 0;
  return {
    ...value,
    itens: value.itens.map(employeeRecord),
    tamanhoPagina: invalidSize ? requestedSize : value.tamanhoPagina,
    pageSizeFallback: invalidSize
  };
}

// Whitelists impedem enviar senha em edição ou propriedades herdadas dos contratos antigos.
export function employeePayload(form, creating = false) {
  const common = { nome: form.nome.trim(), userName: form.userName.trim(), email: form.email.trim() };
  return creating
    ? { ...common, senha: form.senha, tipoUsuario: Number(form.tipoUsuario), idLoja: Number(form.idLoja) }
    : { ...common, ativo: form.ativo };
}

export function validateEmployee(form, creating = false, stores = []) {
  const errors = {};
  if (!form.nome.trim()) errors.nome = 'Informe o nome.';
  if (!form.userName.trim()) errors.userName = 'Informe o usuário.';
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
    form.email.trim().length > (creating ? 200 : 254)
  )
    errors.email = 'Informe um e-mail válido dentro do limite permitido.';
  if (creating) {
    if (!form.senha) errors.senha = 'Informe a senha.';
    if (![1, 2, 3].includes(Number(form.tipoUsuario))) errors.tipoUsuario = 'Selecione o tipo de usuário.';
    if (
      !Number.isSafeInteger(Number(form.idLoja)) ||
      !stores.some((store) => String(store.id) === String(form.idLoja))
    )
      errors.idLoja = 'Selecione uma loja disponível.';
  }
  return errors;
}

// Mensagens genéricas em 500 evitam reproduzir detalhes internos ou presumir uma validação específica.
export function employeeError(error) {
  const messages = {
    400: 'Confira os dados informados. A solicitação não passou na validação.',
    401: 'Sua sessão expirou. Entre novamente.',
    403: 'Você não possui permissão para esta operação.',
    404: 'Funcionário não encontrado. Atualize a listagem.',
    409: 'Existe um conflito com os dados informados.'
  };
  return messages[error?.status] ?? 'Não foi possível concluir a operação de funcionários. Tente novamente.';
}

// Empresa é a do JWT. Loja participa da autorização, mas não filtra os funcionários da empresa.
export function employeeScope(claims) {
  return ['employees', claims?.sub ?? null, claims?.sid ?? null, String(claims?.empresaId ?? '')];
}

// Só mantém cache empresarial quando identidade, sessão, empresa e autorização continuam iguais.
export function retainEmployeeQuery(key, before, after) {
  const permissions = after?.Permissao;
  const canView = (Array.isArray(permissions) ? permissions : [permissions]).includes(
    'Funcionario.Visualizar'
  );
  return (
    canView &&
    Boolean(after?.empresaId) &&
    JSON.stringify(employeeScope(before)) === JSON.stringify(employeeScope(after)) &&
    JSON.stringify(key.slice(0, 4)) === JSON.stringify(employeeScope(after))
  );
}
