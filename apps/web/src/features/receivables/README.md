# Contas a Receber — frontend-first

Rota `/financial/receivables`, no menu Financeiro. Disponível somente em Development; produção apresenta “Aguardando integração”. Nenhum endpoint foi criado ou chamado. Nenhuma regra de autorização foi presumida.

`receivables-model.js` concentra status, saldo, filtros, parcelamento e resumo. Valores são centavos inteiros; somas usam BigInt com verificação de intervalo seguro. A última parcela recebe todo o restante. Cada vencimento parte da primeira data, preservando o dia original após fevereiro. Cada parcela precisa ter ao menos um centavo e uma data civil representável; não há limite comercial de parcelas. A prévia é paginada.

`mockReceivablesRepository` mantém títulos, pagamentos e eventos em um único envelope versionado, na chave `erp.dev.receivables.v1:[usuário,empresa,loja]`. Uma escrita salva a operação inteira; falhas não apagam dados. Web Locks serializa leituras e mutações entre abas quando disponível; há fila por instância como fallback. Uma API futura precisará implementar transações e controle de concorrência no servidor.

Clientes usa o repository existente e seu escopo usuário/empresa, sem cópias independentes. O seletor pesquisa nome e documento alfanumérico, pagina a fonte para não truncar opções e permite novos títulos somente para clientes ativos com `financial.allowReceivables`. Clientes inativados continuam nos títulos históricos. O limite de crédito não bloqueia operações. Fixtures financeiras referenciam apenas `demo-pf-1` se já existir no repository de Clientes; não criam nem habilitam clientes. São identificadas como demonstração e não recebem histórico fictício. Sem essa fixture, a lista começa vazia.

`paymentMethodsRepository` fornece um catálogo imutável DEV de formas de pagamento. A UI não define opções. Pagamentos persistem o identificador, principal baixado, desconto, juros, multa, total e datas. Não existe exclusão ou estorno. O saldo reduz pelo principal; o total efetivamente recebido é principal − desconto + juros + multa. O repository revalida o saldo antes de salvar. Com baixas, cliente, emissão e valor original são imutáveis. Cada edição afeta somente uma parcela. Cancelamento só é permitido sem recebimentos.

Status: Cancelado → Recebido → Vencido → Parcial → Em aberto. Vencimento hoje não está atrasado. A lista revalida a cada minuto e ao retomar o foco. Cards de saldos seguem os filtros da lista; Recebidos usa cliente/busca e um período próprio de datas das baixas (mês atual como padrão). Os rótulos deixam essa distinção explícita.

Hooks e chaves ficam em `receivables-queries.js`: list, summary, detail e methods, sob `['receivables', escopo]`. Detalhe inclui pagamentos e histórico. Mutações invalidam somente esse módulo/contexto. As opções de Clientes reutilizam a família de cache `customers/list`. Componentes reutilizam PageHeader, CreateButton, ConfirmDialog, MoneyField, feedbacks e o ThemeProvider. Tabelas usam scroll horizontal controlado; grids e dialogs se reorganizam em telas menores.

Contratos JSDoc: `receivables-types.js`. A troca por backend deve ocorrer na seleção da fonte, após confirmação de endpoints, DTOs e policies reais. Não conectar diretamente os mocks a produção.

Testes: `node --test tests/receivables.test.mjs` e `node tests/receivables.browser.mjs` (Vite 5173 e Chrome isolado CDP 9230). O navegador usa autenticação simulada apenas no processo de teste, com storage separado de clientes reais.
