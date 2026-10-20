# Produtos e Serviços — catálogo DEV

Rotas: `/products`, `/products/new`, `/products/:id` e `/products/:id/edit`. A navegação usa Produtos → Consulta; os auxiliares ficam em Produtos → Cadastros. O Dashboard mantém seu atalho existente.

As telas usam PageHeader, SectionCard, CreateButton, ConfirmDialog, EntityInfo, EntityStatus, EntityStatusAction e os hooks TanStack Query compartilhados. `productModule.repository` é o ponto de troca por uma API futura; o contrato está em `product-types.js`. As páginas não fazem HTTP de catálogo.

`mockProductsRepository` contém fixtures identificadas como demonstração e implementa busca, filtros, paginação, resumo e mutations. A persistência usa `erp.dev.products.v1:<usuário/empresa>`, independente dos demais módulos. Produção exibe integração pendente. O armazenamento só é acessado pela fonte de dados.

`PRODUCT` e `SERVICE` são variantes do mesmo modelo. Ao salvar, campos específicos do outro tipo são descartados após confirmação de troca no formulário. Serviços não persistem GTIN, NCM, custo, marca ou configuração de estoque. Alternar o tipo durante o preenchimento mantém os valores no rascunho. Desativar controle preserva a configuração. Produtos com quantidade inicial registrada não podem ser convertidos em serviço.

Dinheiro usa centavos inteiros, com limite seguro definido em `components/business/money.js`. O input usa vírgula decimal e aceita formatação BRL; rejeita negativos, expoentes, excesso de casas decimais e valores acima do limite. Margem é configuração percentual, sem cálculo automático. Preço promocional e período ficam no mesmo registro, sem motor de promoções. Código interno, GTIN e NCM permanecem strings. GTIN aceita estrutura numérica de 8/12/13/14 dígitos; NCM exige estrutura de 8 dígitos, sem consulta ou validação fiscal. Quantidades são strings decimais não negativas com até três casas, comparadas em milésimos inteiros. Duração é string de minutos inteiros não negativos.

Criação e edição reutilizam `ProductStepForm`: Dados gerais, Tributação, Estoque e Precificação.
O resumo reflete o rascunho e `StickyFormActions` mantém Cancelar/Voltar/Próximo/Salvar acessíveis.
Nome, código, grupo e unidade são obrigatórios no formulário. Cancelar e voltar para a lista
pedem confirmação quando há alterações; a saída/reload do navegador usa sua proteção nativa.
As validações de cada etapa focam o primeiro campo inválido.

`product-fields.js` centraliza os nomes de campos fiscais compartilhados pelo formulário e perfil:
CEST, origem, CFOP, ICMS, PIS/COFINS, IPI e reforma tributária (CST IBS/CBS, cClassTrib,
IBS estadual/municipal, CBS, IS, benefício, redução e observação). São parâmetros locais,
sem cálculo, enquadramento automático ou catálogo fiscal presumido.

O saldo inicial é cadastrado apenas na criação, junto da loja derivada do contexto oficial.
Não representa saldo corrente nem cria uma movimentação. O repository impede sua alteração
e a troca da loja de abertura na edição. Saldos atuais, movimentações e regras globais
de estoque negativo dependem de integração futura; não há ledger, endpoint ou estoque
multiloja simulado. A configuração local guarda mínimo, máximo, localização e permissão de
negativo, sem interferir em parâmetros do backend.

Grupos usam o repository de `product-groups`; nomes antigos permanecem em `category` e novos vínculos usam `groupId`. Unidades usam o repository de `units`; novos vínculos usam `unitId` e somente unidades ativas podem ser selecionadas. Referências anteriores permanecem visíveis. Na integração futura, validar DTOs e policies reais, substituir o repository e habilitar a fonte real nas páginas; não existem permissões de backend presumidas no mock autenticado.

NCM usa o repository DEV de `ncm`. Novos vínculos usam `ncmId`; o código anterior continua em `ncm`. O seletor compartilha o fluxo de Unidades e permite cadastrar pelo botão +. Apenas NCMs ativos podem ser escolhidos para novos vínculos; referências históricas permanecem visíveis. A base local não é fonte fiscal oficial.

Testes: `node --test tests/products.test.mjs`. Para `node tests/products.browser.mjs`, executar Vite em 5173 e Chrome isolado com CDP em 9230. O teste simula sessão, usa o repository real do frontend e remove apenas suas fixtures locais.
