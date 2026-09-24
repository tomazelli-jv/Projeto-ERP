# Usuários — integração com o backend oficial

Implementação somente frontend na branch `feat/theme-switcher`. O trabalho preexistente de tema e sidebar foi preservado, sem stage, commit, push, PR ou merge. As duas imagens citadas não estavam anexadas; a implementação segue a especificação textual e os tokens do Design System.

## Rotas e navegação

- Listagem: `/admin/users`.
- Criação: `/admin/users/new`.
- Detalhe: `/admin/users/:id`.
- Edição: `/admin/users/:id/edit`.

Administração contém Empresas e lojas e Configurações. Configurações reúne Parametrização, Usuários e Planos. Na sidebar expandida o submenu permanece aberto na rota de Usuários; no mini rail abre um menu lateral. Não há segunda seção chamada Funcionários.

## Contratos confirmados

| Operação | Endpoint e contrato                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Listagem | `GET /api/Funcionario/paginado?pagina=1&tamanhoPagina=10&busca=...`; resposta `{ itens, totalRegistros, pagina, tamanhoPagina }`. |
| Detalhe  | `GET /api/Funcionario/{id}`; `{ id, nome, usuarioId, userName, email, ativo, idVinculosLoja }`.                                   |
| Criação  | `POST /api/Funcionario`; somente `{ nome, userName, email, senha, tipoUsuario, idLoja }`.                                         |
| Edição   | `PUT /api/Funcionario/{id}`; somente `{ nome, userName, email, ativo }`.                                                          |
| Lojas    | Reutiliza o contexto existente alimentado por `GET /api/FuncionarioLoja/minhasLojas`.                                             |

`user-contract.js` adapta o DTO para a UI e mantém `vinculoIds` explicitamente separados de IDs de loja. Criação e edição usam allowlists de payload. Não há wrapper `.data`, X-Loja-Id, endpoints legados ou DELETE.

O enum confirmado é Administrador=1, Administrador de loja=2 e Vendedor=3. A resposta não fornece perfil, telefone, data de cadastro, nome de empresa ou nome das lojas vinculadas. Esses dados não são inventados. A empresa do formulário é somente leitura; quando o contexto só oferece ID, ele é mostrado como tal. O perfil escolhido na criação não é inferido depois nem usado como substituto de uma role Identity.

## Comportamento das telas

- Quatro cards: total global real da empresa, ativos, pendentes e inativos. Os três últimos mostram “— / Indicador indisponível”, pois não há agregação global nem status pendente no contrato.
- Busca por **nome**, com debounce de 350 ms e retorno à página 1. O repository atual não pesquisa e-mail/login; o placeholder não promete esse suporte.
- Paginação server-side, tamanhos 10/20/50, anterior/próxima e intervalo de registros. O backend retorna tamanhoPagina=0; o frontend usa o tamanho que enviou, sem paginação local.
- O paginado não inclui a entidade Usuario, produzindo e-mail/login vazios e ativo=false. Por isso, somente os itens da página visível são completados pelo endpoint de detalhe. Falha isolada mostra informação indisponível, nunca inativo inventado. Isso custa uma chamada extra por item até o backend corrigir a projeção.
- Tabela com iniciais, nome/login, e-mail, chip de status, visualizar e editar. Perfil/data/telefone não aparecem sem fonte real. Exclusão foi omitida devido à policy inconsistente.
- Formulário com dados, vínculo/acesso e resumo lateral. Senha e confirmação existem somente na criação e nunca entram no resumo, storage ou variables da mutation. Política confirmada: 6 caracteres, maiúscula, minúscula e dígito.
- Create informa status inicial Ativo sem switch falso. Edit altera somente nome/login/e-mail/ativo; não oferece alteração fictícia de senha, perfil ou loja.
- Resumo atualiza localmente, sem requisições. Não há promessa de envio de e-mail.
- Mutation bloqueia duplo clique, preserva dados em falhas, invalida somente queries do módulo/contexto e retorna à lista com feedback em sucesso. Cancelar e voltar usam rotas existentes.
- Loading com skeletons, vazio com ação conforme permissão, 403 distinto de vazio, erros amigáveis sem stack trace; 401 permanece na infraestrutura global.

## Permissões e contexto

A UI verifica exclusivamente as claims `Permissao` recebidas: `Funcionario.Visualizar`, `Funcionario.Criar` e `Funcionario.Atualizar`. Nome ADM, e-mail e a existência do override local não liberam botões. A edição também precisa de Visualizar para carregar o detalhe.

O JWT real do ADM local tem role Administrador e contexto das lojas, mas **não tem essas claims**. O override preexistente permite chamadas diretas à API, porém a UI continua bloqueada para esse JWT. A solução oficial de autorização/claims depende do responsável pelo backend. Nenhuma claim foi fabricada no React.

As query keys incluem usuário, empresa e loja. O backend lista por empresa; a loja integra a chave porque a autorização pode variar após a troca oficial de token. Troca de contexto desmonta o formulário anterior e mantém autenticação/activeStore existentes. Nenhuma regra de negócio ou provider de autenticação foi alterado.

## Testes reais e pendências do backend

Testes via HTTP na API local, com login real do ADM e Loja Centro:

| Teste                  | Resultado                                                                         |
| ---------------------- | --------------------------------------------------------------------------------- |
| GET paginado           | 200; três registros; tamanhoPagina retornou 0.                                    |
| GET detalhe            | 200, com login/e-mail/status reais.                                               |
| POST criação           | 500, mesmo com DTO correto e perfil Vendedor.                                     |
| PUT edição             | 200 enviando os mesmos valores existentes do ADM, sem mudança funcional ou senha. |
| Conferência após falha | Listagem permaneceu com três registros e nenhum cadastro de teste.                |

POST enviado: nome/login/e-mail exclusivos de teste, senha gerada somente em memória, tipoUsuario=3, idLoja=1. Nenhum segredo foi registrado. A resposta HTTP foi 500; o log local aponta `Npgsql 23503`, violação de `FK_FuncionarioLojaClaims_FuncionariosLoja_FuncionarioLojaId`.

Causa provável: o vínculo é adicionado ao contexto, mas seu ID gerado ainda não foi persistido quando as claims são montadas usando `vinculo.Id`. Proposta para o responsável: revisar a persistência/associação do vínculo antes de gravar claims, preservando a transação. **Nenhuma correção backend foi realizada.** O sucesso de criação real permanece bloqueado por esse erro.

Outras pendências oficiais: completar a projeção do paginado, devolver tamanhoPagina, ampliar busca se desejado, expor agregações/perfil/data quando suportados e corrigir a policy de exclusão, que hoje exige Criar. Não foram adicionadas permissões nem alterados seeds, roles, migrations ou banco diretamente. Não houve DELETE.

## Validação frontend

- 15 testes Node: contratos, allowlists, IDs de vínculo, permissões, confirmação de senha, contraste, preferências e utilitários de sessões.
- 83 verificações CDP de Usuários passaram: listagem, detalhes, debounce, paginação, guards, create/update, campos permitidos, erro de mutation, preservação do formulário, duplo envio, cancelar, Light/Dark e responsividade. Fixtures existem somente nos testes.
- Regressão existente: 46 verificações de sidebar, 18 de conta/sessões e 16 de auth/temas com API simulada.
- Viewports: 1920×1080, 1440×900, 1366×768, 1024×768 e 768×1024. Tabela tem scroll horizontal localizado; formulário vira uma coluna com resumo abaixo no tablet. Sem overflow horizontal global. Sidebar expanded/mini preservadas.
- Capturas de listagem, criação e edição em ambos os temas produzidas em `tmp/users-*.png`; inspeção visual realizada.
- Format, lint, build e git diff --check passaram. Build mantém aviso de bundle acima de 500 kB.

## Arquivos e integridade

Criados nesta etapa:

- `apps/web/src/api/user-contract.js`
- `apps/web/src/components/users/user-model.js`
- `apps/web/src/components/navigation/SettingsNavigation.jsx`
- `apps/web/src/pages/UserEditorPage.jsx`
- `tests/users.test.mjs`
- `tests/users.browser.mjs`
- este relatório.

Alterados nesta etapa: `api/users.js`, `pages/UsersPage.jsx`, `app/router.jsx`, `app/navigation.js`, `components/navigation/Sidebar.jsx` e `components/common/SectionCard.jsx`. Removido o dialog legado sem uso `components/users/UserAccessDialog.jsx`.

O status frontend também contém os arquivos preexistentes do seletor de tema e sidebar, preservados. Nada foi staged.

Backend antes e depois: ` M ERP.Api/Program.cs` e `?? ad`, ambos preexistentes. O SHA-256 de Program.cs permaneceu `FBE59350B1F82F185724688184EC982B2729136077BB565E1F03520F18C791FC`. **Zero alterações de arquivos backend causadas por esta tarefa.** Nenhum commit, push ou PR.
