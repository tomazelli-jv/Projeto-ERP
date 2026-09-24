// Policies oficiais são claims por ação; nome ADM e bypass local não são autorização de UI.
export function userPermissions(claims) {
  const values = Array.isArray(claims?.Permissao) ? claims.Permissao : [claims?.Permissao];
  return {
    view: values.includes('Funcionario.Visualizar'),
    create: values.includes('Funcionario.Criar'),
    update: values.includes('Funcionario.Atualizar')
  };
}

// Enum confirmado no backend; o DTO de resposta não permite inferir o perfil de um usuário existente.
export const userProfiles = [
  { value: 1, label: 'Administrador' },
  { value: 2, label: 'Administrador de loja' },
  { value: 3, label: 'Vendedor' }
];
export const userInitials = (name) =>
  String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join('')
    .toLocaleUpperCase('pt-BR') || '?';
export const userQueryScope = (claims) => [
  'users',
  String(claims?.sub ?? ''),
  String(claims?.empresaId ?? ''),
  String(claims?.lojaId ?? '')
];

// Mensagens não reutilizam stack traces ou nomenclatura interna vindos do servidor.
export function userError(error) {
  if (error?.status === 403) return 'Você não possui permissão para esta operação.';
  if (error?.status === 400) return 'Confira os dados informados. O servidor não aceitou a solicitação.';
  if (error?.status === 409) return 'Os dados informados entram em conflito com um cadastro existente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function validateUserForm(form, creating) {
  if (!form.nome.trim() || !form.userName.trim() || !form.email.trim())
    return 'Preencha nome, usuário e e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Informe um e-mail válido.';
  if (creating) {
    if (form.senha !== form.confirmacao) return 'As senhas não coincidem.';
    // Identity: seis caracteres, uma letra maiúscula, uma minúscula e um dígito.
    if (
      form.senha.length < 6 ||
      !/[A-Z]/.test(form.senha) ||
      !/[a-z]/.test(form.senha) ||
      !/[0-9]/.test(form.senha)
    )
      return 'Use ao menos 6 caracteres, com maiúscula, minúscula e número.';
    if (
      !userProfiles.some((profile) => profile.value === Number(form.tipoUsuario)) ||
      !Number.isSafeInteger(Number(form.idLoja)) ||
      Number(form.idLoja) <= 0
    )
      return 'Selecione uma loja e um perfil de acesso.';
  }
  return '';
}
