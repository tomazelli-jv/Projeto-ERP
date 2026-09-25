# Produtos e Serviços — catálogo DEV

Rotas: `/products`, `/products/new`, `/products/:id` e `/products/:id/edit`. A navegação permanece em Cadastros → Produtos. O Dashboard mantém seu atalho existente.

As telas usam PageHeader, SectionCard, CreateButton, ConfirmDialog, EntityInfo, EntityStatus, EntityStatusAction e os hooks TanStack Query compartilhados. `productModule.repository` é o ponto de troca por uma API futura; o contrato está em `product-types.js`. As páginas não fazem HTTP de catálogo.

`mockProductsRepository` contém fixtures identificadas como demonstração e implementa busca, filtros, paginação, resumo e mutations. A persistência usa `erp.dev.products.v1:<usuário/empresa>`, independente dos demais módulos. Produção exibe integração pendente. O armazenamento só é acessado pela fonte de dados.

`PRODUCT` e `SERVICE` são variantes do mesmo modelo. Ao salvar, campos específicos do outro tipo são descartados. Serviços não persistem GTIN, NCM, custo, marca ou configuração de estoque. Desativar controle de estoque remove o mínimo. Não há saldo nem movimentação de estoque.

Dinheiro usa centavos inteiros, com limite seguro definido em `components/business/money.js`. O input usa vírgula decimal e aceita formatação BRL; rejeita negativos, expoentes, excesso de casas decimais e valores acima do limite. Não há margem persistida. Código interno, GTIN e NCM permanecem strings. GTIN aceita estrutura numérica de 8/12/13/14 dígitos; NCM exige estrutura de 8 dígitos, sem consulta ou validação fiscal. Quantidade mínima é string decimal não negativa, com até três casas. Duração é string de minutos inteiros não negativos.

Categorias e unidades DEV ficam em `product-options.js`. A unidade também aceita código informado manualmente. Na integração futura, validar DTOs e policies reais, substituir o repository e habilitar a fonte real nas páginas; não existem permissões de backend presumidas no mock autenticado.

Testes: `node --test tests/products.test.mjs`. Para `node tests/products.browser.mjs`, executar Vite em 5173 e Chrome isolado com CDP em 9230. O teste simula sessão, usa o repository real do frontend e remove apenas suas fixtures locais.
