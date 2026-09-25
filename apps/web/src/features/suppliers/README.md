# Fornecedores — demonstração frontend

Rotas: `/suppliers`, `/suppliers/new`, `/suppliers/:id`, `/suppliers/:id/edit`.

A apresentação é compartilhada com Clientes em `features/parties`: `EntityListPage`, `EntityEditorPage`, `EntityTypeChoice`, `EntityStepForm`, `EntityDetail`, `EntitySummary`, `EntityStatusAction` e hooks TanStack Query. `supplier-module.js` seleciona labels, etapas, validação e repository. A escolha PF/PJ antecede a navegação; criação e edição usam Dados Gerais → Endereço e Comercial → Fiscal → Financeiro e a mesma `StickyFormActions` de Clientes. CPF, CNPJ, contato e CEP usam os mesmos campos e helpers, incluindo preenchimento manual quando a consulta falha.

O perfil possui resumo lateral e cards Dados Gerais, Financeiro e Histórico. Somente o conteúdo inferior muda; não há saldos, contas a pagar ou histórico inventado. A listagem mantém os filtros PF/PJ e mostra Fabricante/Distribuidor na coluna Tipo. Cadastros anteriores sem classificação exibem “Não informado”.

O modelo preserva os campos comerciais existentes e acrescenta RG, data de inscrição, classificação e `financial`: percentual de frete não negativo, datas opcionais de visitas, dia da semana e frequência/prazo em dias inteiros positivos. Campos financeiros não informados permanecem vazios (`null` para números). A leitura hidrata defaults sem gravar nem apagar o storage; IDs, datas e dados comerciais antigos são preservados. Nome é obrigatório em PF/PJ, razão social é opcional e documentos continuam validados pelos helpers oficiais.

`mockSuppliersRepository` implementa listagem/paginação, resumo, detalhe, criação, atualização e status, reutilizando o motor `mockPartyRepository`. Não executa HTTP. A chave `erp.dev.suppliers.v1:<usuário/empresa>` e as queries `['suppliers', contexto, ...]` são independentes de Clientes. A UI identifica os dados fictícios e só habilita a demonstração em Development. Não inserir dados pessoais reais.

Para uma API futura, substituir `supplierModule.repository` por um adapter do contrato tipado em `supplier-types.js`, verificar as policies reais e retirar o bloqueio DEV das páginas compartilhadas conforme a disponibilidade do módulo. Nenhum endpoint ou permissão foi presumido.

Testes: `node --test tests/suppliers.test.mjs tests/customers.test.mjs`. Os testes de navegador precisam de Vite em 5173 e Chrome isolado com CDP em 9230: `node tests/suppliers.browser.mjs` e `node tests/customers.browser.mjs`, sequencialmente. Somente autenticação e CEP são simulados; o repository testado é o mesmo da interface.

Fiscal concentra IE, IM e tipo de inscrição (COM INSC, SEM INSC ou ISENTO). COM INSC exige IE; ISENTO e SEM INSC não exigem um número. IM permanece opcional. Registros anteriores conservam suas inscrições.
