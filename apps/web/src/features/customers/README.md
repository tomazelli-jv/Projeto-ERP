# Clientes — demonstração frontend

As telas usam `customer-queries.js` (TanStack Query), que seleciona o repository em um único ponto. O contrato está documentado em `customer-types.js`: `list`, `summary`, `getById`, `create`, `update` e `setActive`. A paginação e os filtros pertencem ao repository.

`mockCustomersRepository.js` funciona sem HTTP e somente é conectado pela UI em Development. A produção mostra o estado de integração pendente. Fixtures são exemplos fictícios, identificados na interface. Não inserir dados pessoais reais nessa demonstração.

A persistência é centralizada no repository, com chave `erp.dev.customers.v1:<usuário/empresa>`. A separação evita compartilhar rascunhos entre contextos. Nenhum token é armazenado. Erros de leitura/gravação são apresentados sem apagar dados. As queries de lista/resumo são invalidadas após mutations, e o detalhe atualizado recebe o novo registro.

Para integrar o backend, implementar o mesmo contrato em um adapter para os DTOs oficiais e substituir a seleção em `useCustomersSource`. Validar também as permissões reais e retirar o bloqueio de demonstração das páginas. Não há policies ou endpoints presumidos nesta versão; todos os usuários autenticados podem testar o mock DEV.

CPF usa `components/business/cpf.js`; máscaras de CPF/CNPJ/telefone/CEP e consulta pública de CEP são reutilizadas. A consulta envia somente CEP, sem credenciais. Número e complemento são preservados.

Validação: `node --test tests/customers.test.mjs`. O teste `node tests/customers.browser.mjs` requer Vite na porta 5173 e Chrome isolado com CDP na porta 9230; simula apenas autenticação e CEP, exercitando o repository de Clientes real. Fixtures do teste ficam exclusivamente nesse navegador isolado.
