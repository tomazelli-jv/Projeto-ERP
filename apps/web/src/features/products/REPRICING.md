# Remarcação de preços

Rota: `/products/repricing`, acessível por Produtos → Remarcação. Tela completa, somente DEV, autenticada e isolada por identidade/empresa pelo `useEntitySource`. Produção informa que a integração está indisponível. Nenhum endpoint HTTP foi criado.

Reutiliza `createMockProductsRepository`, o mesmo armazenamento e as query keys da Consulta. `updatePrices` recebe `{ productId, previousPriceCents, newPriceCents }[]`; valida todo o lote antes de uma única gravação. Produtos inexistentes, inativos, serviços, duplicados, valores inválidos ou preços anteriores divergentes abortam o lote. Sem alteração não grava. Custo, estoque e demais campos permanecem intactos. As escritas compartilham Web Locks quando disponível; sem essa API a validação/leitura/gravação é síncrona, mas não há garantia de exclusão entre processos. O backend futuro deverá oferecer atomicidade e controle de concorrência equivalentes.

Os filtros usam os campos reais `name`, `code`, `gtin`, `groupId/category`, `brandId/brand`, `status`. Marcas e grupos vêm dos auxiliares existentes, incluindo opções inativas para consulta histórica. Produtos legados sem ID podem corresponder pelo nome do auxiliar; nenhum catálogo paralelo é criado. Serviços não participam. A lista não tinha ordenação reutilizável, portanto conserva a ordem do repository.

Seleção mantém IDs entre filtros/páginas; selecionar todos aplica apenas aos ativos visíveis. Alterações de seleção/regra descartam a prévia. Gerar prévia consulta novamente os produtos; só a prévia captura o preço anterior. A revisão completa inclui também seleções fora da página atual. Ajustes manuais são individuais e destacados. Valores inválidos bloqueiam a confirmação. O diálogo preserva a prévia ao voltar e mantém erros de persistência/conflito para revisão. Após sucesso, limpa seleção/prévia e invalida apenas listas e detalhes afetados de Produtos, sem reload ou limpeza global.

Dinheiro reutiliza `parseMoney`, `moneyInput`, `formatMoney`, `validMoney` e o limite oficial. `repricing.js` usa centavos inteiros, percentuais em centésimos de ponto percentual e `BigInt`. Arredonda o preço final para o centavo mais próximo, metade para cima: 9,99 + 5% = 10,49. Aceita duas casas decimais com vírgula, sinais positivos/negativos. Preço final deve ser positivo. Percentual relativo a preço anterior zero é indicado como novo preço, não como divisão por zero.

Responsividade: tabela com scroll em desktop/tablet, cards no mobile e confirmação em tela cheia no mobile. Temas oficiais Light/Dark; topbar preservada. Painel e resumo respeitam movimento reduzido.

Validação automatizada: `node --test tests/repricing.test.mjs tests/products.test.mjs`; `node tests/repricing.browser.mjs` com Vite 5173 e Chrome CDP 9230. O teste de navegador usa identidade de teste isolada e repositories reais, sem credenciais ou alterações de dados operacionais.

Integração futura: substituir a fonte DEV por contrato oficial de atualização em lote e conflitos, quando disponibilizado pelo responsável pelo backend. Sem preço por loja, promoções, agendamento ou auditoria inventada nesta etapa.
