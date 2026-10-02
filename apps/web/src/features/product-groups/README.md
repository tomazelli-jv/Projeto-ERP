# Grupos de produtos — DEV

`GroupsDialog` abre o mesmo `LookupDialog` de Marcas, configurado por `groupModule`. Cabeçalho, filtros, tabela, status, confirmação, formulário, transições e estados de consulta são compartilhados. Nenhuma rota ou endpoint foi criado.

`createMockGroupsRepository` expõe `list`, `getById`, `create`, `update`, `setActive`. ProductGroup contém `id`, `code`, `name`, `description`, `active`, `createdAt`, `updatedAt`. Não há exclusão, parentesco ou subgrupos. Nome é obrigatório e único após normalizar espaços/caixa; descrição é opcional. O repository valida essas regras independentemente da UI.

O motor local compartilhado inicia vazio e usa `erp.dev.product-groups.v1:[usuario,empresa]`. Só Development habilita leitura/mutações. Falhas não apagam dados. Busca por nome/descrição aceita contém, começa com e igualdade. Web Locks serializa escritas entre abas compatíveis. Queries e invalidações possuem namespace próprio, sem invalidar Marcas.

No catálogo, Grupo substitui a antiga lista fixa de Categoria. `category` permanece como descrição histórica, evitando migração destrutiva; `groupId` identifica os novos vínculos. Itens antigos continuam mostrando seu valor. Só ativos podem ser escolhidos para novos vínculos; um vínculo existente inativado permanece visível. A escolha é reconferida antes de salvar. Renomear o grupo atualiza a descrição quando o produto vinculado for editado e salvo, sem reescrever snapshots antigos.

O botão + de Grupo abre o mesmo diálogo e preserva o formulário. Salvar invalida a consulta compartilhada, permitindo selecionar imediatamente o registro novo ao fechar. O filtro da listagem sugere os grupos cadastrados e permite digitar nomes históricos; não há segunda lista fixa.

Integração com backend depende de contrato futuro. Dados DEV não são enviados ou migrados automaticamente.

Testes: `node --test tests/groups.test.mjs tests/brands.test.mjs tests/products.test.mjs`. Fluxos de navegador usam Chrome isolado/CDP 9230, Vite 5173 e sessão simulada; não usam credenciais reais.
