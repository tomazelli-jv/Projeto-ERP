# Fornecedores — demonstração frontend

Rotas: `/suppliers`, `/suppliers/new`, `/suppliers/:id`, `/suppliers/:id/edit`.

A apresentação é compartilhada com Clientes em `features/parties`: `EntityListPage`, `EntityEditorPage`, `EntityProfile`, `EntitySummary`, `EntityStatusAction` e hooks TanStack Query. `supplier-module.js` seleciona labels, validação e repository de Fornecedores. Os dados comerciais são as únicas seções adicionais; CPF, CNPJ, contato e CEP usam os mesmos helpers de Clientes.

`mockSuppliersRepository` implementa listagem/paginação, resumo, detalhe, criação, atualização e status, reutilizando o motor `mockPartyRepository`. Não executa HTTP. A chave `erp.dev.suppliers.v1:<usuário/empresa>` e as queries `['suppliers', contexto, ...]` são independentes de Clientes. A UI identifica os dados fictícios e só habilita a demonstração em Development. Não inserir dados pessoais reais.

Para uma API futura, substituir `supplierModule.repository` por um adapter do contrato tipado em `supplier-types.js`, verificar as policies reais e retirar o bloqueio DEV das páginas compartilhadas conforme a disponibilidade do módulo. Nenhum endpoint ou permissão foi presumido.

Testes: `node --test tests/suppliers.test.mjs tests/customers.test.mjs`. Os testes de navegador precisam de Vite em 5173 e Chrome isolado com CDP em 9230: `node tests/suppliers.browser.mjs` e `node tests/customers.browser.mjs`, sequencialmente. Somente autenticação e CEP são simulados; o repository testado é o mesmo da interface.
