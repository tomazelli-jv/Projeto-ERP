# Design system light

Branch `feat/light-design-system`, criada da main atualizada em `a1ecb9f`, após confirmar a árvore limpa e o commit dark `98d6a27`. Sem commit/push/PR. Como dark ainda não está na main, seus componentes visuais foram reaproveitados seletivamente, sem merge de outras features. O commit dark continua preservado.

A imagem mencionada na solicitação não foi recebida; a referência usada foi a especificação textual de superfícies claras quentes, identidade dourada e densidade de ERP.

## Paleta e arquitetura

| Token                             | Valor                                         |
| --------------------------------- | --------------------------------------------- |
| Fundo / fundo sutil               | #F4F1EA / #EEE9DF                             |
| Paper                             | #FCFBF8                                       |
| Superfície secundária / hover     | #F7F4EE / #F1EBDD                             |
| Borda / borda suave               | #D9D1C3 / rgba(88,74,45,0.12)                 |
| Texto / secundário / desabilitado | #1F1B16 / #6E665C / #A49B8D                   |
| Dourado / hover                   | #C9A646 / #B89335                             |
| Dourado para texto e foco         | #795B16                                       |
| Dourado suave / borda             | rgba(201,166,70,0.14) / rgba(201,166,70,0.32) |
| Sucesso / warning / erro / info   | #3D7150 / #795B16 / #A0443C / #416B7A         |

O dourado sólido permanece nas ações principais. Texto, ícones e foco usam a variante escura para contraste adequado sobre superfícies claras. Não há cores hex nas páginas: 13 ocorrências anteriores de valores hex em theme/Sidebar foram substituídas pela configuração semântica central.

`theme-tokens.js` exporta lightPalette e darkPalette. `createErpTheme(mode)` usa a mesma tipografia e os mesmos overrides para ambos; o tema ativo é light. Não há toggle, novo ThemeProvider, fonte externa, biblioteca visual ou persistência. Dark mantém sua paleta sem ser removido.

Fonte existente Inter/Roboto/Arial; títulos de página até 30px, seção 16px, body 14px e secundário 13px. Raios: inputs/botões 8px, cards 10px, dialogs 12px. Bordas e variações de superfície fazem a separação, com sombras mínimas.

## Componentes e páginas

- Sidebar desktop de 264px, navegação compacta com item selecionado suave, drawer abaixo de md, identidade textual e rodapé de usuário com nome/e-mail reais. Minha Conta usa a rota existente; nenhuma role é inventada.
- Header de 64px com seletor de loja, ambiente e menu de usuário existentes. Label de loja permanece legível mesmo sem loja selecionada. Sem busca global fictícia ou notificações inventadas.
- Área principal com padding 16/20/24px, largura máxima 1680px, mesmo padrão do dark.
- Dashboard com saudação real, quatro indicadores indisponíveis, Faturamento/Últimos 7 dias em empty state honesto, atalhos para rotas existentes e atividades sem histórico inventado.
- Login recebe tema claro, painel sóbrio, campos e ação principal dourada. Handlers, senha, autenticação e navegação intactos.
- Minha Conta recebe os estilos globais sem alterar AccountPage ou funções de sessões/revogação/logout.
- ModulePage usa título, separador, ícone e status discreto, sem card gigante. 404 recebe o tema global.
- EmptyState compartilhado mantém dados/ações existentes com padding menor e ícone compacto. Skeleton permanece para carregamento real.
- Tabelas: cabeçalho com superfície secundária, separadores horizontais, hover de linha, ações existentes preservadas.
- Formulários: fundo claro destacado, borda sutil, foco contrastante e labels legíveis. Botões com altura mínima de 40px; ação principal dourada, secundária neutra e danger discreto.
- Dialogs com borda, raio de 12px, título legível e footer padronizado. Menus e tooltips usam superfícies semânticas. Chips/alerts apresentam cores sóbrias e texto, sem depender apenas de cor.

Reutilizados: AppShell, Sidebar, PageHeader, SectionCard, EmptyState, componentes Material UI, dialogs e roteamento atuais. Não foi criado um segundo sistema visual. Overrides centralizados abrangem Button, TextField/OutlinedInput/InputLabel, Paper/Card, Dialog, Menu/MenuItem, Chip, Alert, TableCell/TableRow, Tooltip, Drawer, AppBar, Avatar, SvgIcon, Skeleton e CssBaseline.

## Validação e limites

- Seis testes Node passaram: quatro existentes de sessões e dois testes de contraste para light e dark. Texto principal, secundário e dourado escuro atingem pelo menos 4.5:1 nas superfícies; botão principal e hover também. Estados desabilitados não são considerados texto ativo nesses testes.
- Dezoito verificações existentes de Minha Conta passaram com API simulada, incluindo revogação, erro, logout normal/global, 401 com um refresh/retry, loading e vazio.
- Seis verificações adicionais passaram: login, restore, Dashboard após login, troca de loja, menu do usuário e preservação de contratos.
- Onze verificações visuais passaram: light em Dashboard, Minha Conta, ModulePage e 404; cinco viewports; drawer aberto; ausência de novas exceções runtime na aba de teste.
- Viewports: 1920×1080, 1440×900, 1366×768, 1024×768 e 768×1024. Sem overflow horizontal global. Indicadores usam os breakpoints existentes de 4/2/1 colunas; sidebar fixa no desktop e drawer em telas menores.
- Capturas de Dashboard e Login produzidas em aba isolada com fixtures de teste. Nenhum dado fictício foi inserido no código do produto. Os scripts adicionais de inspeção ficam em tmp/light-visual.mjs e tmp/light-auth.mjs, fora do versionamento.
- Foco visível global e componentes nativos preservados; foco inicial do login e dialogs existentes exercitados. Não foi feita auditoria exaustiva de leitor de tela ou teclado.
- Formulários empresariais e Funcionários não têm rotas funcionais nesta main; não foram artificialmente ativados. Sua aparência se beneficia dos overrides, mas não foi realizado teste de negócio dessas features.
- Não foi repetido teste com conta/API real nesta etapa exclusivamente visual. As regressões acima são de fronteira simulada; nenhum endpoint, contrato ou código auth foi alterado.
- Format, lint, build e git diff --check passaram. Build mantém aviso de bundle acima de 500 kB. Testes existentes de conta foram apenas normalizados quanto a finais de linha, sem diff de conteúdo.

## Arquivos e integridade

Criados: `apps/web/src/app/theme-tokens.js`, `tests/theme-palettes.test.mjs`, este relatório.

Alterados: `apps/web/src/app/theme.js`, `apps/web/src/app/navigation.js`, `apps/web/src/components/feedback/EmptyState.jsx`, `apps/web/src/components/layout/AppShell.jsx`, `apps/web/src/components/navigation/Sidebar.jsx`, `apps/web/src/pages/DashboardPage.jsx`, `apps/web/src/pages/ModulePage.jsx`.

Status frontend: alterações locais e arquivos novos não staged. Backend: somente o preexistente `?? ad`, intocado; nenhum arquivo rastreado alterado. Sem modificações em banco, JWT, roles, permissões, contratos, .env ou dependências. Nenhum segredo incluído. Sem commit, push ou PR.
