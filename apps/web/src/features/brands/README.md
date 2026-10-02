# Marcas — frontend-first

`BrandsDialog` é o cadastro único, reutilizável pela navegação ou futuramente pelo Produto. Não cria rota nem endpoint. A consulta e o formulário compartilham o mesmo Dialog. O repository começa vazio, sem dados reais ou seeds automáticos.

`useBrandsSource` seleciona `createMockBrandsRepository` somente para operações habilitadas em Development, com armazenamento `erp.dev.brands.v1:[usuario,empresa]`. Em produção o diálogo informa a integração pendente. TanStack Query compartilha os dados com o seletor de Produto e invalida somente Marcas após alterações. Nenhuma permissão de backend é presumida.

Brand contém `id`, `code`, `name`, `cnpj`, `contact`, `active`, `createdAt`, `updatedAt`. Códigos são strings geradas localmente; nomes duplicados são rejeitados no repository, ignorando caixa e espaços repetidos, inclusive para marcas inativas. CNPJ opcional usa os helpers oficiais. Contato é texto livre. Não existe exclusão.

O contrato do repository é `list(filters)`, `getById(id)`, `create(data)`, `update(id,data)`, `setActive(id,active)`. Filtros: `field` (name/cnpj/contact), `match` (contains/starts/equals), `search`, `activeOnly`. A consulta retorna `{items,total}` e pagina a apresentação local em dez registros. Falhas de leitura ou gravação não apagam o armazenamento. Web Locks serializa gravações entre abas compatíveis.

Produtos usa `brandId` para novos vínculos e preserva `brand` como descrição histórica. Marcas inativas e nomes legados permanecem visíveis no produto existente; novos vínculos oferecem somente ativas e são reconferidos ao salvar. Renomear uma marca não altera retroativamente snapshots dos produtos; editar e salvar atualiza a descrição do vínculo. Serviços não persistem marca.

Integração futura deve substituir o adapter após confirmação do contrato HTTP, autorização e escopo pelo responsável pelo backend. Dados DEV não são migrados automaticamente.

Validação: `node --test tests/brands.test.mjs tests/products.test.mjs`. `node tests/brands.browser.mjs` usa Chrome isolado com CDP na porta 9230 e frontend na 5173, com autenticação simulada apenas na aba de teste. Não usa credenciais reais.
