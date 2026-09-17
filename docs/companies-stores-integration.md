# Empresas e Lojas — integração frontend

Implementação em 17/09/2026. Backend oficial inspecionado somente em leitura.

1. **Rota:** `/admin/companies`, substituindo o placeholder sem criar outra área.
2. **Componentes criados:** `BusinessFormDialog`, `BusinessDetailDialog`; helpers `business-model.js` e `business-styles.js`.
3. **Componentes adaptados:** `CompaniesPage`, `LojaCard`, registro no router e breadcrumb. Formulários antigos `EmpresaFormDialog` e `LojaFormDialog` substituídos pelo formulário compartilhado, removendo contratos legados.
4. **Empresa — endpoints confirmados:** `GET/POST /api/Empresa`, `GET/PUT/DELETE /api/Empresa/{id}`, `GET /api/Empresa/paginado`. Paginação aceita `nome`, `ativo`, `pagina`, `tamanhoPagina`; resposta `itens`, `pagina`, `tamanhoPagina`, `totalItens`, `totalPaginas`. A tela usa GET completo.
5. **Loja — endpoints confirmados:** `GET/POST /api/Loja`, `GET/PUT/DELETE /api/Loja/{id}`. Sem paginação ou filtro de empresa na listagem.
6. **Empresa DTO:** `id`, `nome`, `dataCadastro`, `ativo`. Criação: `nome`; atualização: `nome`, `ativo`. Não há CNPJ, razão social separada ou nome fantasia no DTO Empresa.
7. **Loja DTO:** `id`, `empresaId`, `razaoSocial`, `nome`, `tipoPessoa`, `documento`, `telefone`, `email`, `cep`, `cidade`, `rua`, `uf`, `ativo`, `dataCadastro`.
8. **Criar Loja:** `empresaId`, `razaoSocial`, `nome`, `tipoPessoa`, `documento`, `telefone`, `email`, `cep`, `cidade`, `rua`, `uf`. `ativo` não é enviado: o model inicia ativo. Tipo de pessoa: Física=1; Jurídica=2. Sem número, bairro ou complemento no contrato atual.
9. **Editar Loja:** mesmos campos da criação mais `ativo`; nunca envia `id`, `dataCadastro`, `nomeFantasia` ou campos legados. `empresaId` vem da empresa selecionada; a UI não oferece transferência de loja. O mapper do backend não altera EmpresaId.
10. **Autorização:** Empresa exige role `Administrador` em todas as ações; Loja exige essa role para listar/criar/atualizar/excluir. GET Loja/{id} exige policy `Loja.ListarTodas`, não registrada em `PoliticasPermissao` atual. Nenhum fallback por nome ADM.
11. **Empresa atual:** preferência por `empresaId` do JWT dentro da lista retornada; primeira empresa acessível quando não houver correspondência. Com múltiplas empresas, seletor local explícito. Com uma, card direto.
12. **Lojas:** GET `/Loja` é limitado pelo backend ao `empresaId` do JWT. Só consultado quando empresa selecionada corresponde ao contexto; filtragem defensiva por `empresaId`. Outra empresa apresenta orientação para selecionar sua loja no seletor global, sem inventar lista vazia/contagem zero.
13. **Matriz:** nenhum campo identifica matriz; não há inferência pelo nome.
14. **Status:** campo booleano `ativo` do DTO; chips Ativa/Inativa. Contagem deriva da lista real somente após sucesso.
15. **CNPJ:** helpers existentes `normalizeCnpj`, `formatCnpj`, `validateCnpj`. String uppercase, letras e zeros preservados, 12 posições alfanuméricas + 2 verificadores numéricos. Exemplo testado `12.ABC.345/01DE-35`. Backend atual ainda usa `SomenteDigitos` no validador e pode rejeitar esse documento; pendência backend, sem conversão silenciosa no frontend.
16. **Endereço:** rua, cidade/UF e CEP; valores ausentes removidos sem `undefined`, `null` ou vírgulas vazias. Campos inexistentes no contrato não são inventados.
17. **Visualizar Empresa:** Dialog amplo/fullscreen no mobile, perfil com avatar, status, nome e data reais. Consulta individual GET Empresa/{id}.
18. **Visualizar Loja:** mesmo padrão de perfil, dados cadastrais, contato e endereço. Usa DTO completo retornado por GET Loja; evita depender do GET individual atualmente quebrado. Não há endpoint falso nem mock no produto.
19. **Criação de loja:** Dialog com cards por seção, resumo lateral dinâmico, empresa fixa e ações no rodapé; POST Loja com allowlist do DTO. Não cria vínculos automaticamente no frontend. A API atual também não cria vínculo de funcionário na criação.
20. **Edição:** disponibilizada a partir do detalhe; PUT oficial. Rascunho permanece aberto em erro, botões ficam indisponíveis durante envio e trava síncrona evita duplicação.
21. **Inativação:** suportada por PUT Loja/{id} com `ativo=false`, preservando demais campos. Confirmação MUI obrigatória.
22. **Reativação:** PUT com `ativo=true`; botão Ativar somente para loja inativa, também com confirmação.
23. **DELETE:** exclusão física no repository; nunca usado para status. Nenhum botão de exclusão nesta etapa. Se o contrato mudar, status deve ser reavaliado, sem substituir por DELETE.
24. **Light:** superfícies quentes, bordas suaves, dourado e status semânticos.
25. **Dark:** mesmos componentes e tokens do tema, sem componentes duplicados ou cores fixas.
26. **Responsividade:** listagem, detalhe e cadastro verificados a 1920, 1440, 1366, 1024, 768 e 390 px. Cards horizontais tornam-se verticais; dialogs fullscreen no mobile.
27. **Sidebar:** item direto em Administração preservado; modo expandido e recolhido verificados. Header/global store selector inalterados.
28. **Permissões e cache:** queries bloqueadas sem role Administrador, inclusive para usuário chamado ADM; 403 distinto de vazio. Cache `business/sub/empresaId/lojaId`, com company/store específicos. Mutations invalidam apenas módulo e `my-stores` do funcionário, sem limpar cache global ou mudar activeStore. Inativação da loja ativa avisa que a sessão não muda automaticamente.
29. **API real localhost:5054:** login/seleção DEV 200; GET Empresa 200 (1 empresa); GET Empresa/1 200; GET Loja 200 (2 lojas); GET Loja/1 500. Sessão de teste encerrada por logout 204. Não houve POST/PUT/DELETE empresarial real para respeitar a restrição de não alterar banco. Escritas validadas com API simulada isolada.
30. **Testes adicionados:** `tests/business.test.mjs` e `tests/business.browser.mjs`, cobrindo DTOs, CNPJ, autorização, cache, endereço, loading, vazios, erros, 403, dados reais das fixtures, detalhes, create/update/status, confirmação/cancelamento, empresa diferente e responsividade. Fixtures existem somente no teste CDP.
31. **Format:** `npm.cmd run format:check` aprovado.
32. **Lint:** `npm.cmd run lint` aprovado.
33. **Build:** `npm.cmd run build --workspace=@tomazelli/web` aprovado; aviso de bundle acima de 500 kB permanece.
34. **Testes:** 20 testes unitários aprovados; 234 verificações de navegador aprovadas: Empresa/Loja 69, Conta 18, Sidebar 46, Usuários 101. API simulada exclusivamente nas abas isoladas de teste.
35. **Diff:** `git diff --check` aprovado (aviso local LF/CRLF não é erro de whitespace).
36. **Arquivos criados nesta etapa:** quatro arquivos em `components/business` citados no item 2; dois testes citados no item 30; este relatório.
37. **Arquivos alterados:** `api/business.js`, `app/navigation.js`, `app/router.jsx`, `components/business/LojaCard.jsx`, `components/business/business-formatters.js`, `pages/CompaniesPage.jsx`. Dois dialogs legados removidos, substituídos pelo compartilhado. Alterações anteriores de Usuários preservadas.
38. **Git frontend:** branch `feat/theme-switcher`, alterações locais sem stage. Inclui alterações preexistentes em `UserEditorPage.jsx`, `UserProfile.jsx`, `tests/users.browser.mjs` e breadcrumb do perfil em `navigation.js`.
39. **Git backend preexistente:** `M ERP.Api/Program.cs`, `M ERP.Infrastructure/Security/JwtAccessTokenService.cs`, `?? ad`.
40. **Integridade backend:** nenhuma escrita em arquivos executada nesta tarefa. Status final idêntico ao inicial. SHA256 de Program.cs permaneceu `23613683B9632F9196391A3811004B42B9AB618622A5B0CF32529E51D6FD643D`; de JwtAccessTokenService.cs permaneceu `A6861F678431D973A7F21939844AD08EE6F1327D32BD22ED8CB1EC6B700CAB37`. Arquivos locais preexistentes preservados; `ad` não foi aberto, editado, renomeado, removido ou adicionado ao Git.
41. **Commit:** nenhum commit nem git add.
42. **Push:** nenhum push, PR ou merge.
43. **Pendências exclusivas backend:** registrar/corrigir policy `Loja.ListarTodas` (GET individual 500); aceitar CNPJ alfanumérico; oferecer listagem por empresa para administrador se desejado; definir comportamento de sessão ao inativar a loja ativa e vínculo automático na criação se esses fluxos forem necessários. CNPJ de empresa, flag matriz e campos adicionais de endereço só podem aparecer quando o contrato os fornecer.

## Evidência do endpoint bloqueado

- Request: `GET http://localhost:5054/api/Loja/1`, Authorization Bearer em memória (não registrado).
- Status observado: **500**. Nenhum segredo ou stack trace exibido na interface.
- Policy declarada: `Loja.ListarTodas`; registro ausente em `PoliticasPermissao.AdicionarPoliticas`.
- Causa provável: resolução de policy inexistente pelo middleware de autorização.
- Proposta ao responsável backend: definir e registrar a policy pretendida, sem conceder acesso por nome de usuário.
- Alternativa frontend aplicada: DTO completo de GET Loja, já autorizado e confirmado com status 200.
