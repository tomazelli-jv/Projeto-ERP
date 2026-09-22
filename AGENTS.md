# AGENTS.md — Projeto ERP Tomazelli

## 1. Escopo permanente

Este repositório é o **frontend oficial** do ERP Tomazelli.

Frontend:
`C:\Users\RENSOFTWARE\Documents\Projeto ERP\ERP`

Backend oficial:
`C:\Users\RENSOFTWARE\Documents\Projeto ERP\backend\ERP`

REGRA ABSOLUTA: o backend pertence a outro desenvolvedor e deve ser tratado como **READ-ONLY**.

Você pode inspecionar o backend para entender:

- controllers;
- DTOs;
- endpoints;
- policies;
- models;
- enums;
- Swagger;
- contratos HTTP.

Você não pode alterar:

- C#;
- controllers;
- services;
- repositories;
- DTOs;
- migrations;
- seeds;
- banco;
- policies;
- roles;
- autenticação;
- JWT;
- configuração;
- qualquer arquivo do backend.

Se o frontend depender de algo ausente, incorreto ou inconsistente no backend:

1. não contorne com gambiarra no frontend;
2. não altere o backend;
3. documente claramente a dependência para o responsável pelo backend.

## 2. Stack oficial do frontend

Preservar a stack existente:

- React;
- Vite;
- Material UI;
- React Router;
- TanStack Query.

Não instalar bibliotecas novas sem necessidade real.

Antes de adicionar dependência:

1. verificar solução existente;
2. preferir APIs nativas;
3. reutilizar componentes/utilitários;
4. justificar a nova dependência.

## 3. Regra de implementação

Antes de implementar:

1. inspecionar a implementação atual;
2. reutilizar componentes, helpers, hooks e padrões;
3. evitar sistemas paralelos;
4. evitar duplicação;
5. adaptar a solução à arquitetura real.

Não reescrever módulos inteiros quando uma alteração localizada resolver.
Não remover funcionalidade existente sem necessidade explícita.

## 4. Comentários no código — obrigatório

Todo arquivo criado ou significativamente alterado deve possuir **comentários técnicos úteis**.

Comentar principalmente:

- responsabilidade de módulos;
- componentes importantes;
- hooks;
- integrações HTTP;
- adapters;
- autenticação/autorização;
- cache;
- validações;
- comportamento de negócio;
- decisões técnicas não óbvias;
- responsividade relevante.

Não comentar linhas triviais.
Os comentários devem explicar intenção e motivo.

## 5. Design System

O ERP deve ser:

- moderno;
- comercial;
- profissional;
- limpo;
- elegante;
- funcional;
- com boa densidade de informação;
- sem aparência genérica de template;
- sem aparência de “dashboard de IA”.

Evitar:

- glassmorphism;
- blobs;
- gradientes decorativos;
- excesso de sombras;
- radius exagerado;
- emojis decorativos;
- widgets sem função;
- textos de marketing;
- excesso de cores;
- animações chamativas.

Preferir:

- bordas discretas;
- espaçamento consistente;
- tipografia clara;
- hierarquia visual forte;
- dourado/mustard como accent;
- superfícies bem definidas;
- radius moderado.

## 6. Light e Dark

O sistema deve funcionar nos modos:

- light;
- dark;
- system, quando suportado.

Light e Dark usam:

- mesmos componentes;
- mesma estrutura;
- tokens semânticos;
- Material UI ThemeProvider.

Não criar páginas ou sidebars duplicadas apenas para trocar cores.

Evitar lógica espalhada como:
`mode === 'dark' ? '#fff' : '#000'`

Preferir:

- `theme.palette`;
- tokens semânticos;
- `components.styleOverrides`;
- `components.defaultProps`.

### Direção Light

- fundo off-white/bege muito claro;
- superfícies claras/quentes;
- texto escuro;
- bordas suaves;
- dourado como destaque.

### Direção Dark

- fundo quase preto/chumbo;
- superfícies grafite;
- texto off-white;
- bordas discretas;
- dourado como destaque.

## 7. Sidebar e AppShell

A Sidebar é retrátil no desktop.

Estados:

- expanded;
- collapsed.

Desktop:

- expanded: aproximadamente 260–280px;
- collapsed: aproximadamente 72–80px.

Mobile/tablet:

- preferir Drawer temporário;
- não manter mini-sidebar fixa em celular.

Quando recolhida:

- mostrar somente ícones;
- usar Tooltips;
- preservar item ativo;
- manter avatar/usuário no rodapé;
- o conteúdo principal deve ganhar largura real.

Estrutura administrativa desejada:

- Empresas e Lojas
- Configurações
  - Parametrização
  - Usuários
  - Planos

“Empresas e Lojas” permanece fora de Configurações.

## 8. Usuários no frontend x Funcionario no backend

Na interface do ERP, a seção se chama **Usuários**.

O backend pode utilizar entidade/endpoint **Funcionario**.

Essa diferença deve ficar encapsulada na integração.

Não expor “Funcionário” ao usuário final nessa área.

Se necessário, usar adapter:
`FuncionarioDto -> UserViewModel`

Não criar duas seções separadas:

- Usuários;
- Funcionários.

## 9. Autenticação e contexto

Preservar a autenticação oficial:

- access token somente em memória;
- refresh token via cookie HttpOnly;
- refresh compartilhado;
- máximo de uma repetição após 401;
- restauração de sessão via refresh;
- loja ativa derivada do contexto oficial/JWT;
- não inventar headers antigos.

Não usar contratos legados como:

- `X-Loja-Id`;
- `/auth/me` antigo;
- `/contexto` antigo.

Não criar atalhos como:
`if (userName === 'ADM')`

Autorização deve vir de:

- roles;
- claims;
- permissões reais do JWT/backend.

Se o backend retornar 403:

- tratar corretamente;
- documentar claim/role ausente;
- não burlar.

## 10. Contratos HTTP

O backend é a fonte de verdade.

Antes de integrar:

1. inspecionar controller;
2. confirmar rota;
3. confirmar método HTTP;
4. confirmar DTO;
5. confirmar resposta;
6. confirmar paginação;
7. confirmar filtros;
8. confirmar policy.

Não confiar cegamente em código legado do frontend.

Não inventar:

- endpoints;
- query params;
- wrappers `.data`;
- filtros;
- campos;
- status.

Se a referência visual possuir campo não suportado pelo backend:

- não enviar campo inexistente;
- não fingir persistência;
- adaptar a UI de forma honesta.

## 11. TanStack Query

Usar TanStack Query para dados de servidor quando aplicável.

Regras:

- query keys consistentes;
- invalidar somente o necessário;
- não limpar cache global sem motivo;
- preservar contexto de empresa/loja;
- tratar loading, erro e empty state.

Em mutations:

- bloquear duplo submit;
- manter formulário em caso de erro;
- feedback coerente;
- invalidar apenas queries relacionadas.

## 12. CNPJ — regra permanente

CNPJ deve suportar formato **alfanumérico**.

CNPJ normalizado:

- exatamente 14 caracteres;
- posições 1–12: `A-Z` ou `0-9`;
- posições 13–14: dígitos verificadores numéricos;
- manipular como string;
- preservar zeros à esquerda.

Exemplo:
`12.ABC.345/01DE-35`
normalizado:
`12ABC34501DE35`

Exemplo legado:
`11.222.333/0001-81`

Ao normalizar:

- trim;
- uppercase;
- remover apenas `.`, `/` e `-`;
- rejeitar caracteres desconhecidos.

Nunca usar para CNPJ:

- `\D`;
- `replace(/\D/g, '')`;
- `onlyDigits`;
- `parseInt`;
- `Number`.

Reutilizar o helper oficial já existente.
Não criar segunda implementação.

## 13. CEP

CEP continua numérico.

É permitido:

- remover caracteres não numéricos;
- normalizar para 8 dígitos.

Não confundir CEP com CNPJ.

Se houver consulta externa:

- não enviar JWT;
- não enviar Authorization;
- não enviar dados pessoais desnecessários;
- enviar somente o CEP;
- falha da API não pode impedir preenchimento manual.

Preservar máscara de CEP existente.

## 14. Dados reais

Não inventar dados com aparência de produção.

Não fabricar:

- valores de dashboard;
- CNPJ;
- endereço;
- datas;
- telefone;
- perfil;
- empresa;
- loja;
- status;
- atividades;
- métricas.

Se integração ainda não existir, usar:

- `—`;
- “Aguardando integração”;
- empty state;
- estado indisponível.

Nunca apresentar mock como dado real.

## 15. Segurança

Não expor:

- senhas;
- hashes;
- JWT completo;
- refresh token;
- cookies;
- connection strings completas;
- signing keys;
- secrets.

Não salvar credenciais sensíveis em:

- localStorage;
- sessionStorage;
- logs;
- arquivos versionados.

Preferências visuais como tema/sidebar podem usar localStorage.

## 16. Responsividade

Toda nova tela deve funcionar pelo menos em:

- 1920x1080;
- 1440x900;
- 1366x768;
- 1024px;
- 768px.

Desktop:

- aproveitar espaço;
- boa densidade;
- tabelas e cards profissionais.

Tablet:

- reorganizar grids;
- preservar legibilidade.

Mobile:

- uma coluna quando necessário;
- Drawer para navegação;
- evitar controles comprimidos.

Não fixar largura baseada apenas na Sidebar expandida.

## 17. Acessibilidade

Garantir quando aplicável:

- labels;
- `aria-label`;
- Tooltips em IconButtons;
- foco visível;
- navegação por teclado;
- contraste;
- estados disabled;
- hover/focus/selected.

Não usar `div` como botão quando um elemento apropriado existir.

## 18. Git — regra padrão

Antes da tarefa:

- `git status`
- `git branch --show-current`
- `git diff --stat`

Preservar trabalho existente.

Não executar de forma destrutiva sem autorização:

- `git reset`;
- `git clean`;
- `git restore` descartando trabalho;
- checkout destrutivo.

Por padrão, NÃO fazer:

- `git add`;
- `git commit`;
- `git push`;
- PR;
- merge.

Só executar commit/push/PR se o usuário pedir explicitamente na tarefa atual.

Nunca fazer force push sem autorização explícita.

## 19. Backend read-only — verificação final

Ao final de tarefas que envolvam inspeção do backend:

1. verificar `git status` no backend;
2. confirmar que nenhuma alteração foi causada pela tarefa.

Não limpar estado preexistente do backend.

Se existir arquivo local preexistente não rastreado:

- não abrir/editá-lo sem necessidade;
- não apagar;
- não adicionar;
- não fazer stash/clean.

## 20. Validação padrão

Quando aplicável, executar no frontend:

`npm.cmd run format:check`

`npm.cmd run lint`

`npm.cmd run build --workspace=@tomazelli/web`

`git diff --check`

Também executar testes frontend relevantes existentes.

Se algum script não existir:

- informar;
- não inventar.

## 21. Testes

Ao criar funcionalidade, testar:

- happy path;
- loading;
- empty state;
- erro;
- autorização quando relevante;
- Light;
- Dark;
- responsividade;
- integrações principais.

Não criar testes frágeis baseados em detalhes internos desnecessários do Material UI.

Preferir comportamento observável pelo usuário.

## 22. Finalização de tarefa

Antes de encerrar:

- remover `console.log`;
- remover debug;
- remover mocks temporários;
- remover imports sem uso;
- remover código morto;
- verificar hardcodes desnecessários;
- revisar diff.

No relatório final, informar apenas o que for relevante:

- arquivos alterados;
- comportamento implementado;
- endpoints usados;
- testes executados;
- pendências reais;
- status do frontend;
- confirmação de backend intacto;
- confirmação de commit/push somente quando aplicável.

Evitar relatórios gigantes quando uma resposta curta for suficiente.

## 23. Princípio geral

O objetivo é construir um ERP real, comercial e sustentável.

Prioridades:

1. corretude;
2. segurança;
3. integração fiel aos contratos reais;
4. UX consistente;
5. reutilização;
6. manutenção simples;
7. design profissional;
8. evitar código morto e soluções provisórias escondidas.

Se houver conflito entre referência visual e comportamento real do backend:

- preservar a verdade funcional do sistema;
- adaptar o visual.

Se uma funcionalidade depender do backend:

- implementar o máximo possível no frontend;
- documentar claramente o bloqueio;
- nunca alterar o backend sem autorização explícita do responsável.
