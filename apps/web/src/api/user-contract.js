// Adaptador do contrato Funcionario: IDs de vínculo nunca são convertidos em IDs de loja.
export function mapUser(dto) {
  if (!dto || dto.id == null) throw new Error('Resposta de usuário inválida.');
  return {
    id: String(dto.id),
    nome: dto.nome ?? '',
    userName: dto.userName ?? '',
    email: dto.email ?? '',
    ativo: typeof dto.ativo === 'boolean' ? dto.ativo : null,
    usuarioId: dto.usuarioId == null ? null : String(dto.usuarioId),
    vinculoIds: Array.isArray(dto.idVinculosLoja) ? dto.idVinculosLoja.map(String) : []
  };
}

// Allowlist impede enviar confirmação, empresa, status de criação ou campos de edição não suportados.
export const createUserDto = (form) => ({
  nome: form.nome.trim(),
  userName: form.userName.trim(),
  email: form.email.trim(),
  senha: form.senha,
  tipoUsuario: Number(form.tipoUsuario),
  idLoja: Number(form.idLoja)
});
export const updateUserDto = (form) => ({
  nome: form.nome.trim(),
  userName: form.userName.trim(),
  email: form.email.trim(),
  ativo: form.ativo
});
