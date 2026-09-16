# Funcionários — Etapa 3

Implementação na branch `feat/employees-ui`, sem commit/push/PR. API oficial indisponível em localhost:5054 durante esta etapa. _*Necessário usuário DEV com permissão Funcionario.* para teste funcional._* Nenhum JWT real foi obtido ou impresso. A criação está implementada sob as permissões reais do contexto, mas não está validada ponta a ponta.

## Escopo e interface

- Rota própria `/admin/employees`, menu **Funcionários** em Administração. `/admin/users` permanece placeholder, sem conectar UsersPage antiga.
- Reaproveitados PageHeader, SectionCard, EmptyState, ErrorState, LoadingState, Material UI, cliente HTTP central e contextos existentes. O formulário antigo de acessos foi inspecionado; suas APIs, perfis e seleção de múltiplas lojas não foram reutilizados.
- Listagem em tabela: nome, usuário, e-mail, status, quantidade de vínculos e ações. E-mail fica oculto abaixo de md, disponível nos detalhes. Scroll de tabela é local em telas estreitas.
- Busca no servidor com debounce de 400 ms e retorno à página 1. Paginação usa total real; tamanho ausente/zero utiliza o solicitado e apresenta aviso visível da inconsistência do backend.
- Detalhe consultado por ID em dialog. Resposta vazia/malformada ou ID diferente é rejeitada. Edição somente de nome, userName, email e ativo; não contém senha, tipo ou lojas.
- Criação possui nome, usuário, e-mail, senha, tipo e loja inicial. Tipos numéricos: Administrador=1, AdmLoja=2, Vendedor=3. O texto explica que tipo não concede automaticamente role Identity.
- Loja inicial usa somente lojas ativas do contexto operacional pertencentes à empresa do JWT. Ausência/erro/loading dessas lojas bloqueia criação, sem bloquear listagem. A interface não promete listar todas as lojas administrativas.
- `idVinculosLoja` é tratado como uma coleção de vínculos: a UI mostra sua quantidade, nunca inventa nomes ou usa esses IDs como idLoja.
- Status usa Chip com texto Ativo/Inativo; edição permite alterar ativo conforme contrato. A interface não promete revogação automática de sessões ao inativar, pois isso depende do backend.
- Sem exclusão, reset de senha, gestão de roles/permissões ou alteração de vínculos.

## Autorização, contexto e cache

- Helper `hasPermission` reconhece a claim exata `Permissao`, string ou array. Username ADM e roles não substituem permissões.
- Sem Visualizar: mensagem e nenhuma consulta de funcionários. Sem Criar: nenhum botão de cadastro. Sem Atualizar: detalhes disponíveis, edição oculta. Sessão sem empresa não consulta o módulo.
- Query keys: `['employees', sub, sid, empresaId, 'list', {page,pageSize,search}]` e `['employees', sub, sid, empresaId, 'detail', id]`.
- Empresa vem exclusivamente do JWT. Nenhuma seleção administrativa de empresa, header X-Loja-Id ou filtro por loja é enviado.
- Operações invalidam somente listas e detalhe do funcionário dentro da sessão/empresa. Mutação não executa queryClient.clear().
- Ajuste no OperationalContextProvider: a troca de loja preserva queries de funcionários somente se identidade, sessão, empresa e permissão Visualizar permanecem válidas. As demais queries continuam descartadas. Listas possuem staleTime de 30 segundos. Troca de empresa/sessão ou perda de permissão remove esse cache.
- Rascunhos são desmontados na mudança de sessão/empresa/permissões; o dialog também desmonta durante troca de loja. Após a troca pode reabrir com dados recarregados, sem preservar senha.
- Senha somente no formulário/chamada; limpa antes do envio, apagada da closure após término e nunca colocada nas variables do MutationCache como objeto de dados. Sem armazenamento, logging ou senha na edição. Falha no cadastro exige redigitar a senha.

## Contratos utilizados

| Método | Endpoint                    | Payload/resposta                                                                          |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/api/Funcionario/paginado` | Query pagina, tamanhoPagina, busca; resposta itens, totalRegistros, pagina, tamanhoPagina |
| GET    | `/api/Funcionario/{id}`     | FuncionarioDto                                                                            |
| POST   | `/api/Funcionario`          | nome, userName, email, senha, tipoUsuario, idLoja                                         |
| PUT    | `/api/Funcionario/{id}`     | nome, userName, email, ativo                                                              |

O contexto reutiliza `/api/FuncionarioLoja/minhasLojas`. A autenticação/troca mantém as APIs existentes. Nenhuma dependência nova de `/usuarios`, `/funcionarios`, `/perfis`, `/lojas`, `/usuarios-funcionarios`, `/api/v1` ou localhost:5001. O módulo antigo continua em disco, desconectado desta rota.

400/401/403/404/409 têm mensagens próprias. Falhas 500/rede usam mensagem genérica, sem presumir conflito/validação e sem expor exceção interna. Os detalhes de autenticação/refresh são responsabilidade do cliente central.

## Validação

- `npm.cmd run format:check`: passou.
- `npm.cmd run lint`: passou.
- `npm.cmd run build --workspace=@tomazelli/web`: passou, com aviso de bundle maior que 500 kB.
- `git diff --check`: passou.
- `node --test tests/employees.test.mjs`: seis testes passaram (permissões, resposta/paginação, payloads, validação, cache por empresa e erros).
- `node tests/employees.browser.mjs`: 26 verificações passaram no Edge com API interceptada, incluindo lista, busca, paginação, leitura, criação, edição, ausência de permissão, empty/loading/403, payloads, troca de loja, credentials, ausência de rotas legadas e senha em storage. Larguras 1920, 1366, 768 e 390 sem overflow global.
- A automação de navegador exige frontend em 5173 e navegador isolado com CDP em 9230. Cria nova aba com fixtures, não usa sessão real. Não executar o script raiz npm test, que ainda referencia o backend legado; usar os comandos acima.
- Teste com API real: **pendente**. Porta 5054 não respondeu. Não foi iniciada a API porque o startup pode executar migrations/seeds, incompatível com a preservação do banco nesta auditoria/validação. Nenhum usuário real foi usado; as claims de teste são apenas fixtures de fronteira, sem inferência sobre usuários DEV.
- Cookies HttpOnly, refresh real e autorização real de criação/edição não foram revalidados nesta etapa. O formulário não deve ser considerado aprovado para produção apenas pelos mocks.

## Arquivos e integridade

Novos: `api/employees.js`, `api/employees-contract.js`, `app/auth/permissions.js`, `hooks/useEmployees.js`, `pages/EmployeesPage.jsx`, `components/users/EmployeeDialog.jsx` (todos em apps/web/src), `tests/employees.test.mjs`, `tests/employees.browser.mjs` e este relatório.

Alterados: `apps/web/src/app/router.jsx`, `apps/web/src/app/navigation.js` e `apps/web/src/app/operational-context/OperationalContextProvider.jsx`. Nenhum arquivo .env ou dependência foi alterado. A branch iniciou limpa; Empresa/Loja, Dashboard e launcher não foram transportados para ela.

Status frontend: os três arquivos acima modificados, novos arquivos não rastreados; nada staged. Status backend: somente o preexistente `?? ad`, que permaneceu intocado. Nenhum arquivo backend, PostgreSQL, seed, migration ou policy alterado. Sem commit/push/PR.

## Encaminhar ao responsável pelo backend

1. Disponibilizar usuário DEV/local com empresa, vínculo e claims Funcionario.Visualizar/Criar/Atualizar para teste funcional.
2. Corrigir policy Funcionario.Excluir (atualmente exige Criar) e tratamento de funcionário inexistente. Exclusão não implementada no frontend.
3. Proteger GET/PUT de permissões de FuncionarioLoja e verificar escopo; não consumidos aqui.
4. Registrar/corrigir Loja.ListarTodas. O módulo não depende dessa consulta.
5. Preencher TamanhoPagina na resposta e padronizar retorno de consulta inexistente.
6. Preservar tipos de erro de validação na criação, evitando convertê-los em 500.
7. Confirmar/validar que idLoja pertence à empresa e ao escopo permitido na criação, sem depender da filtragem visual.
8. Confirmar semântica de TipoUsuario.Administrador (mapeamento de permissões vazio, sem concessão automática de role) e efeitos de inativação sobre sessões.
