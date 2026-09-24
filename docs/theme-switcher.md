# Seletor de aparência

Branch `feat/theme-switcher`, baseada em `8751041` da feature light ainda não integrada à main. Árvore inicialmente limpa; referências remotas atualizadas. Sem commit, push ou PR.

## Implementação

- A auditoria encontrou uma fábrica `createErpTheme` e duas paletas já centralizadas. Sidebar, Dashboard, Login, Minha Conta e componentes compartilhados utilizam tokens semânticos. Não foi necessário duplicar páginas ou redesenhar as paletas.
- `ThemeModeProvider` substitui o ThemeProvider fixo e expõe `themeMode`, `resolvedMode`, `setThemeMode` e `toggleTheme` pelo hook `useThemeMode`.
- `erp.themeMode` guarda somente `light`, `dark` ou `system` no localStorage. Ausência, valor inválido ou storage indisponível usam Sistema. Falha ao gravar não impede a troca na aba; alterações de storage sincronizam outras abas.
- MUI `useMediaQuery` acompanha `prefers-color-scheme` e gerencia o cleanup do listener. Preferência explícita não acompanha alterações do sistema. O tema Material UI recebe somente light ou dark.
- O botão do header fica entre ambiente e conta. Sol/lua, tooltip e aria-label descrevem o modo de destino. O clique sai de Sistema para o modo explícito oposto ao resolvido.
- O menu da conta contém Aparência: Claro, Escuro e Sistema, com semântica `menuitemradio` e seleção pela preferência, não pelo modo resolvido.
- A preferência é lida na inicialização síncrona. Um script inicial define o color-scheme nativo antes do bundle; CssBaseline aplica os tokens a html/body/root. Transições de cores duram 180ms e respeitam movimento reduzido.
- Providers de sessão, consultas e contexto operacional mantêm sua identidade; nenhuma chave ou remontagem é introduzida pela troca de tema.
- Sem dependências novas, alteração de contratos, persistência de tokens ou mudanças no backend.

## Verificação

Oito testes Node passaram: preferência/fallback sem browser, contraste das duas paletas e utilitários de sessões. Dezesseis verificações de navegador com API simulada passaram, incluindo login, restauração, troca de loja, menu, persistência após reload, mudança automática do sistema, Sistema permanecendo selecionado, Login dark e fallback de preferência inválida. A troca de tema não gerou chamadas adicionais de autenticação/contexto.

Scripts auxiliares do navegador ficam em `tmp/theme-switcher.browser.mjs` e usam uma instância isolada, sem a conta real do operador. Não houve teste com backend real nesta etapa visual. A especificação recebida termina na seção HEADER; foram implementados os requisitos disponíveis.
