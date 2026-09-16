# Empresa e lojas — integração frontend

Branch: `feat/company-store-management-ui`. Backend oficial consultado somente para leitura. Base do client: `/api`. Nenhuma alteração de banco ou backend nesta etapa.

## Contratos encontrados

| Método | Rota                                 | Autorização               | Request                  | Response                         | Uso nesta tela                              |
| ------ | ------------------------------------ | ------------------------- | ------------------------ | -------------------------------- | ------------------------------------------- |
| GET    | /api/Empresa                         | Administrador             | —                        | EmpresaDto[]                     | Listagem administrativa global              |
| GET    | /api/Empresa/{id}                    | Administrador             | id                       | EmpresaDto                       | Consulta da empresa selecionada             |
| PUT    | /api/Empresa/{id}                    | Administrador             | AtualizarEmpresaDto      | EmpresaDto                       | Edição                                      |
| POST   | /api/Empresa                         | Administrador             | CriarEmpresaDto          | EmpresaDto, 201                  | Criação de empresa                          |
| DELETE | /api/Empresa/{id}                    | Administrador             | id                       | 204                              | Não exposto: exclusão física                |
| GET    | /api/Empresa/paginado                | Administrador             | FiltroEmpresaDto         | ResultadoPaginadoEmpresaDto      | Não utilizado                               |
| GET    | /api/Loja                            | Administrador             | —                        | LojaDto[]                        | Somente quando selecionada a empresa do JWT |
| GET    | /api/Loja/{id}                       | Política Loja.ListarTodas | id                       | LojaDto                          | Bloqueado: política não registrada          |
| POST   | /api/Loja                            | Administrador             | CriarLojaDto             | LojaDto, 201                     | Criação                                     |
| PUT    | /api/Loja/{id}                       | Administrador             | AtualizarLojaDto         | LojaDto                          | Edição e status                             |
| DELETE | /api/Loja/{id}                       | Administrador             | id                       | 204                              | Não exposto: exclusão física                |
| GET    | /api/FuncionarioLoja/minhasLojas     | Autenticado               | —                        | Lista de lojas ativas vinculadas | Contexto multiloja existente                |
| GET    | /api/FuncionarioLoja/meuVinculo      | Autenticado               | —                        | Vínculo ou 403                   | Não utilizado                               |
| GET    | /api/FuncionarioLoja/vinculos        | Autenticado               | —                        | Lista de vínculos                | Não utilizado                               |
| GET    | /api/FuncionarioLoja/{id}/permissoes | Autenticado               | id do vínculo            | Lista de permissões              | Não utilizado                               |
| PUT    | /api/FuncionarioLoja/{id}/permissoes | Autenticado               | SincronizarPermissoesDto | 204                              | Não utilizado                               |

EmpresaDto: `id`, `nome`, `ativo`, `dataCadastro`. AtualizarEmpresaDto: `nome`, `ativo`.

LojaDto: `id`, `empresaId`, `razaoSocial`, `nome`, `tipoPessoa`, `documento`, `telefone`, `email`, `cep`, `cidade`, `rua`, `uf`, `ativo`, `dataCadastro`. CriarLojaDto usa os campos cadastrais e empresaId; AtualizarLojaDto também exige ativo. O alias nomeFantasia é somente visual: o payload envia nome. Não existem número, bairro ou complemento nesses contratos.

Erros: 400 por validação (ValidationProblemDetails ou Status/Mensagem); 401 por autenticação; 403 por autorização; 404 por entidade ausente; 409 por ConflitoException. Não há códigos estáveis específicos de Empresa/Loja. O client central continua responsável por Bearer, cookies e refresh; a tela traduz status conhecidos.

## Implementação final

A página anterior exigia Administrador e empresaId no JWT. Agora a entrada exige somente autenticação e a role Administrador (claim URI do Identity, com fallback role; string ou array). Nome ADM, email e Permissao nunca concedem acesso.

CompaniesPage administra selectedCompanyId em state local. Prefere a empresa do JWT apenas se constar na lista autorizada; caso contrário seleciona a primeira disponível. Nova empresa é selecionada após resposta 201 e refetch. Selecionar A/B remonta os detalhes e descarta formulários, sem trocar JWT, lojaId, empresaId operacional ou activeStore. Nada é persistido em storage.

A tela oferece Nova empresa, empty state Cadastrar primeira empresa, consulta/edição, seletor de empresas e Nova loja. EmpresaFormDialog é compartilhado entre criação (somente nome) e edição (nome/ativo). LojaFormDialog preserva campos reais, CPF existente separado e CNPJ alfanumérico. Não existem exclusões físicas na UI.

Chaves: business / usuarioId / sid / companies; business / usuarioId / sid / company / selectedCompanyId; esta última acrescida de stores para lojas. Empresa editada invalida detalhe e lista; loja salva invalida somente a lista alvo e my-stores, que atualiza nomes sem trocar activeStore. Sem optimistic updates.

Loading separado por lista, detalhe e lojas; mutations têm campos/botões bloqueados, feedback de sucesso e mensagem de erro. 400 orienta revisar campos; 401 sessão expirada; 403 permissão; 404 cadastro ausente; 409 conflito; 500 ou rede indisponível mostra mensagem genérica. Dialog Material UI mantém foco/teclado e labels; layouts responsivos foram verificados em 1920, 1366 e 768 pixels.

Status usa PUT completo. Inativação exige confirmação. A empresa operacional atual e a loja ativa continuam protegidas na UI enquanto o backend não tratar as sessões; outras entidades usam o contrato existente. Criar loja não cria automaticamente vínculo de funcionário.

## Limitação confirmada de lojas por empresa

- Endpoint atual: GET /api/Loja, sem parâmetro de empresa.
- Comportamento: LojaService.ListarLojasAsync converte IdEmpresa do usuário logado para long e consulta somente essa empresa. Sem empresaId há risco de exceção; selecionar outra empresa no frontend não muda esse contexto.
- Necessário: consulta administrativa autorizada que aceite empresa alvo explicitamente e retorne suas lojas, inclusive inativas.
- Proposta de contrato para o responsável (NÃO implementada nem chamada): GET /api/Empresa/{empresaId}/lojas, role Administrador, sem body; 200 com LojaDto[], 403 sem acesso, 404 empresa ausente.
- Dependência: master sem empresa e navegação entre empresas precisam dessa lista para visualizar/editar lojas já cadastradas. O GET individual usa a política Loja.ListarTodas não registrada e não resolve descoberta de IDs.
- UI: não chama GET /Loja quando selectedCompanyId difere do JWT ou o JWT não possui empresa. Mostra indisponibilidade, sem declarar lista vazia falsa. POST /Loja continua permitido pelo contrato com empresaId selecionado; feedback confirma criação, mas não simula uma listagem persistida.

## Requisitos adicionais para o backend

1. Atribuir a role Administrador ao ADM autorizado e emiti-la no JWT. Teste HTTP real: login 200, isAdministrator=false, hasCompany=false; GET /api/Empresa retornou 403. O frontend não pode corrigir essa autorização.
2. Validação atual do Documento/CNPJ precisa suportar CNPJ alfanumérico. CnpjValidator usa SomenteDigitos.Extrair. Request esperado no POST/PUT /api/Loja: documento como string 12ABC34501DE35 e tipoPessoa 2, demais campos conforme DTO. Não houve gravação real: a autorização atual impede homologação; nenhum status de validação CNPJ real foi inferido.
3. Registrar/revisar Loja.ListarTodas no GET /api/Loja/{id}; atualmente não aparece em PoliticasPermissao.
4. Tratar sessões/refresh após inativação, inclusive de outros usuários, e especificar o contrato de inativação da empresa/loja operacional atual.
5. Uniformizar limites DTO/EF de cidade/email; a UI utiliza o menor limite conhecido. Definir unicidade de documento e corrigir fixtures com documento/tipoPessoa inválidos.
6. Autorizar e restringir cada operação de Empresa/Loja no servidor. Seleção administrativa e filtros visuais não são barreira de segurança.

## Validação desta execução

- Backend real: login ADM 200; role Administrador ausente; empresaId ausente; consulta empresas 403. A sessão criada pelo teste foi encerrada. Não foram alterados cadastros, roles ou banco por comandos diretos.
- Navegador Edge real, API simulada: 21 verificações passaram. Incluem administrador sem/com empresa, não administrador, empty state, validação obrigatória, cancelar/reabrir, criar/selecionar/editar empresa, payload de loja com empresa administrativa e CNPJ alfanumérico, A/B/A sem vazamento, edição de loja, 409, preservação do contexto, larguras 1920/1366/768, credentials include, ausência de X-Loja-Id e JWT em storage.
- Cenários simulados não comprovam aceitação de gravações reais. Criação/edição/inativação real e refresh autenticado completo de master estão pendentes por role/contrato backend. Falhas HTTP 400/401/404/500 possuem tratamento, mas não foram todas exercitadas no navegador.
- Sem Vitest/Testing Library no projeto. Adicionados testes com node:test, sem dependências: node --test tests/company-store.test.mjs. Cobrem role URI/string/array, administrador sem empresa, não conceder acesso nominal e CNPJ legado/alfanumérico/inválido.
- Nenhuma chamada antiga foi adicionada: API central com /Empresa e /Loja, cookies/Bearer existentes, sem /api/v1, /auth/me, /contexto ou localhost:5001.

## Integridade e arquivos

Backend somente leitura: nenhum arquivo rastreado alterado; arquivo não rastreado preexistente ad permaneceu intocado. Sem migrations, seeds, controllers ou políticas alterados.

Frontend: api/business.js; app/router.jsx; app/auth/roles.js; hooks/useBusiness.js; pages/CompaniesPage.jsx; componentes business EmpresaFormDialog, LojaFormDialog, LojaCard e business-formatters; tests/company-store.test.mjs; este documento. Reutilizada a preparação salva em 42d0c11 após criar branch a partir de main atualizada. O commit anterior e o launcher permanecem na branch original; nenhum commit novo foi criado pela tarefa.

Nenhum segredo adicionado. Nenhum commit, push ou PR nesta execução.
