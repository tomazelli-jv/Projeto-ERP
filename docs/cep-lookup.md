# Consulta automática de CEP

- Provedor: [ViaCEP](https://viacep.com.br/), consulta HTTPS pública sem chave.
- Serviço novo: `apps/web/src/api/cep.js`. Normalização remove pontuação sem truncar e exige exatamente 8 dígitos; adapter retorna cep/street/neighborhood/city/state e descarta os demais dados.
- Hook novo: `apps/web/src/app/useCepLookup.js`. Dispara somente na alteração manual do campo, debounce de 350 ms, cache TanStack em memória por CEP por uma hora. Nunca consulta só por abrir edição. AbortController cancela a requisição anterior; identidade da solicitação e comparação de CEP no merge impedem resposta obsoleta. Timeout de 7 segundos.
- Integração: Nova/Editar Loja em `BusinessFormDialog.jsx`; `ContactField.jsx` recebeu apenas feedback auxiliar. Rua, cidade e UF são preenchidos quando retornados. Empresa não tem endereço no DTO. Bairro não existe no formulário/DTO de Loja atual: disponível no adapter para futuros cadastros, não enviado como campo extra. Número e complemento nunca são mapeados ou sobrescritos.
- Máscara CEP existente preservada integralmente. Helpers CNPJ não foram alterados nesta tarefa.
- Cliente externo usa fetch próprio, credentials omit e referrerPolicy no-referrer; não recebe Authorization, cookies, JWT ou outros dados do formulário.
- Erro/not-found exibe orientação junto ao CEP; endereço continua editável e salvar não depende da consulta. Loading discreto via texto; sem mudança de foco. Componentes MUI continuam usando Light/Dark existentes.
- Testes novos: `tests/cep.test.mjs`, mockando apenas fetch público. Cobrem normalização, CEP incompleto, máscara preservada, adapter, quatro campos, preservação de número/complemento, CEP obsoleto, privacidade, inexistência e rede.
- Testes unitários existentes e novo: 22 aprovados. Format/lint/build/diff-check aprovados. Build mantém aviso de chunk >500 kB.
- Consulta real pelo cliente de serviço: 01001000 retornou Praça da Sé/Sé/São Paulo/SP; 00000000 retornou CEP_NOT_FOUND. Isso verifica o transporte real, não substitui teste manual do usuário na tela.
- Backend: nenhuma escrita realizada. Status preexistente preservado: M ERP.Api/Program.cs; M ERP.Infrastructure/Security/JwtAccessTokenService.cs; ?? ad. Sem alterações de banco, DTOs ou autenticação.
- Frontend: alterações anteriores de máscaras/listagem preservadas; novos arquivos desta tarefa são cep.js, useCepLookup.js, cep.test.mjs e este relatório; alterados nesta tarefa BusinessFormDialog.jsx e ContactField.jsx.
- Nenhum git add, commit, push, PR ou merge.

## Validação em navegador

O formulário real foi montado em `tests/fixtures/cep-harness.html` e `cep-harness.jsx`, sem API empresarial simulada. `tests/cep.browser.mjs` substitui apenas ViaCEP e passou em 11 verificações: edição sem consulta inicial, CEP incompleto, concorrência A/B com resposta atrasada ignorando abort, cidade/UF, ausência de autenticação externa, inexistência, offline, digitação manual e renderização Light/Dark.

Regressões: Conta 18, Empresas/Lojas 69 e Usuários 101 verificações aprovadas. Testes de Sidebar executados novamente isoladamente após interferência de foco entre abas durante a primeira execução.

Resultado final: Sidebar também aprovada (46 verificações). Total: 245 verificações de navegador e 22 testes unitários aprovados.
