# Unidades de medida — frontend-first

`UnitsDialog` configura o `LookupDialog` de Marcas/Grupos. Não cria página, endpoint, conversão ou embalagem. O diálogo compartilha consulta, formulário, confirmação, animações, estados de erro e paginação local.

`createMockUnitsRepository` expõe `list`, `getById`, `create`, `update`, `setActive`. O modelo UnitOfMeasure tem `id`, `code`, `abbreviation`, `description`, `active`, `createdAt`, `updatedAt`. Sigla e descrição são obrigatórias. Sigla é string, normalizada por trim/uppercase, e única inclusive entre inativas. Segue o limite existente do catálogo de dez letras/dígitos; caracteres inválidos são rejeitados, nunca removidos silenciosamente. Descrições iguais são permitidas.

Persistência DEV: `erp.dev.units.v1:[usuario,empresa]`. Fixtures locais identificadas no código incluem as doze unidades solicitadas e SERV, preservando o uso anterior em serviços. Não existe segunda lista fixa em Produtos. Dados armazenados substituem as fixtures, inclusive uma lista vazia; falhas não apagam dados. Produção mostra integração pendente.

Novos vínculos usam `unitId`, preservando a sigla em `unit`. A seleção exibe apenas ativas e mantém visível a unidade anterior inativa ou legada. O helper `resolveProductUnit` reconfere o vínculo antes de salvar; uma inativação em outra aba não permite um novo vínculo. Um produto existente pode manter sua referência. Renomear uma sigla atualiza o snapshot quando o produto for editado e salvo; não reescreve registros anteriores automaticamente.

O botão + usa o mesmo diálogo sem submeter ou descartar o rascunho do produto. A invalidação de queries permite selecionar a nova unidade imediatamente após fechar o cadastro.

Testes: `node --test tests/units.test.mjs tests/groups.test.mjs tests/brands.test.mjs tests/products.test.mjs`. O teste `tests/units.browser.mjs` exige Chrome isolado/CDP 9230 e Vite 5173, usando identidade simulada e storage próprios, sem credenciais reais.
