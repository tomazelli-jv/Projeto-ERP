# Sidebar retrátil — entrega frontend

Implementada sobre o Design System e o seletor de tema pendentes na branch `feat/theme-switcher`, preservando todos os arquivos existentes. As imagens mencionadas não estavam anexadas; foi usada a especificação textual.

| Item                      | Resultado                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1. Estado anterior        | Sidebar fixa de 264 px, sem preferência; header com offset fixo e conteúdo limitado a 1680 px.                                 |
| 2. Arquitetura            | Uma Sidebar, um conteúdo, Drawer permanente no desktop e temporário em telas menores.                                          |
| 3. Expanded width         | 264 px, centralizado em `layout-tokens.js`.                                                                                    |
| 4. Collapsed width        | 76 px, no mesmo arquivo.                                                                                                       |
| 5. Persistência           | `erp.sidebarCollapsed`, somente `true` recolhe; ausência, erro ou valor inválido expandem.                                     |
| 6. Toggle                 | Chevron sob a marca, labels Recolher/Expandir menu lateral; transição de 200 ms respeita movimento reduzido.                   |
| 7. Dark                   | Paleta existente: superfícies escuras, ícones neutros e ativo dourado.                                                         |
| 8. Light                  | Paleta existente: superfícies claras quentes, ícones neutros e ativo dourado.                                                  |
| 9. Ícones                 | Material Icons existentes; área de navegação com 44 px de altura.                                                              |
| 10. Labels                | Retirados ao recolher para não vazar durante a redução; nenhum texto espremido.                                                |
| 11. Tooltips              | Nome do módulo no modo recolhido, tooltip de identidade no avatar; sem redundância quando expandido.                           |
| 12. Ativo                 | Superfície e marcador dourados, aria-current; correspondência por segmento inclui subrotas.                                    |
| 13. Grupos                | Títulos no expandido; divisores preservados no recolhido.                                                                      |
| 14. Marca expandida       | T, Tomazelli e ERP Comercial.                                                                                                  |
| 15. Marca recolhida       | T centralizado, bloco de marca com mesma altura.                                                                               |
| 16. Usuário expandido     | Avatar, nome e e-mail reais quando disponíveis, sem inventar função.                                                           |
| 17. Usuário recolhido     | Avatar centralizado abre o menu de conta já existente.                                                                         |
| 18. AppShell              | Flex: sidebar + coluna com header sticky e main; sem offsets fixos por largura.                                                |
| 19. Conteúdo              | Ganha 188 px no desktop; removido limite arbitrário de largura.                                                                |
| 20. Header                | Começa imediatamente após a sidebar e acompanha sua largura.                                                                   |
| 21. Dashboard             | Grid existente recalcula com a largura disponível, sem mudança de dados.                                                       |
| 22. Desktop               | A partir de lg, 1200 px, permite expandir/recolher sem mudar rota ou sessão.                                                   |
| 23. Tablet                | 1024 px usa Drawer temporário, sem rail permanente.                                                                            |
| 24. Mobile                | Drawer expandido, hamburger no header; navegação, Escape e backdrop fecham.                                                    |
| 25. Acessibilidade        | Buttons e links nativos, aria-label nos ícones, aria-expanded no toggle, foco do tema preservado.                              |
| 26. Teclado               | Toggle por Space e navegação por Enter exercitados; controles participam da ordem nativa de Tab.                               |
| 27. Automação             | Dois testes de preferência e script CDP com 46 verificações de sidebar.                                                        |
| 28. Viewports             | 1920×1080, 1440×900, 1366×768, 1024×768 e 768×1024, light e dark. Sem overflow horizontal.                                     |
| 29. Regressões            | 18 verificações de conta/sessões e 16 de auth/tema passaram com API simulada: login, refresh, loja, logout, sessões e Sistema. |
| 30. Format                | `npm.cmd run format:check`.                                                                                                    |
| 31. Lint                  | `npm.cmd run lint`.                                                                                                            |
| 32. Build                 | Vite aprovado, com aviso de bundle acima de 500 kB.                                                                            |
| 33. Testes                | 10 testes Node passaram, incluindo os existentes; sidebar/conta/tema executados em navegador isolado.                          |
| 34. Diff                  | `git diff --check`.                                                                                                            |
| 35. Criados nesta etapa   | layout-tokens.js, useSidebarPreference.js, sidebar-preference.test.mjs, sidebar.browser.mjs e este relatório.                  |
| 36. Alterados nesta etapa | AppShell.jsx e Sidebar.jsx.                                                                                                    |
| 37. Frontend              | Alterações locais não commitadas, incluindo os arquivos preexistentes do seletor de tema.                                      |
| 38. Backend               | Apenas `?? ad`, preexistente.                                                                                                  |
| 39. Integridade           | Nenhum arquivo backend modificado/criado; sem alteração de API, token, loja, autenticação ou banco.                            |
| 40. Publicação            | Nenhum commit, push ou PR.                                                                                                     |

## Evidências e limites

O teste verifica que recolher não dispara HTTP e que somente a chave da sidebar muda no storage. As 46 verificações terminaram sem erros novos de console/runtime. Preferência persiste após F5 e navegação desktop; o tema permanece independente. Capturas light/dark, expanded/mini, foram inspecionadas em `tmp/sidebar-*.png`.

Os testes de navegador usam fixtures isoladas, sem gravar dados fictícios no produto ou acessar conta real. Empresa/Loja e Funcionários não têm telas operacionais integradas nesta base; não foi alegada validação de suas tabelas de negócio. O main agora permite usar toda a largura disponível quando esses módulos forem integrados.

Execução: frontend em localhost:5173 e navegador isolado com CDP em localhost:9230; `node tests/sidebar.browser.mjs`. Os testes existentes usam o mesmo mecanismo. Execute os scripts de navegador em sequência para evitar interferência de foco/viewport entre abas de teste.
