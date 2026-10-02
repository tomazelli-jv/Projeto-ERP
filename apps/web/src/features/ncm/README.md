# NCM — frontend-first

`NcmDialog` configura o diálogo compartilhado de Marcas, Grupos e Unidades. Usa quatro colunas: NCM, descrição, status e ações. Não cria página, endpoint ou regras fiscais adicionais.

O modelo Ncm contém `id`, `code`, `description`, `active`, `createdAt`, `updatedAt`. Código é string com exatamente oito dígitos; descrição é obrigatória. A entrada usa `onlyDigits` existente, sem máscara nova. O repository rejeita entradas inválidas e duplicadas, inclusive entre inativos. Não há conversão numérica do NCM, exclusão ou inferência de descrição.

`createMockNcmRepository` expõe `list`, `getById`, `create`, `update`, `setActive`. A persistência DEV é `erp.dev.ncm.v1:[usuario,empresa]`, com exemplos técnicos explicitamente não oficiais. Falhas não apagam os dados. Em produção o cadastro fica aguardando integração. Não é uma fonte fiscal oficial.

Produto usa o seletor compartilhado `LookupCodeField` com `NcmField`; o botão + abre o mesmo cadastro e a invalidação permite escolher o novo registro. Só ativos aparecem para novos vínculos. Registros anteriores inativos ou legados permanecem visíveis. `ncmId` identifica novos vínculos e `ncm` mantém o código histórico. Ao editar/salvar, o código vinculado é reconferido. Serviços não persistem NCM.

Testes: `node --test tests/ncm.test.mjs tests/units.test.mjs tests/groups.test.mjs tests/brands.test.mjs tests/products.test.mjs`. O teste de navegador usa Vite 5173, Chrome isolado/CDP 9230 e identidade simulada própria. Não utiliza credenciais reais.
