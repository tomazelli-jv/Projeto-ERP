# Autenticação global e sessões

## Login e access token

`POST /api/v1/auth/login` aceita somente `email` e `password`. O e-mail é normalizado; a senha é usada exatamente como recebida. Respostas inválidas são genéricas e a verificação Argon2id usa um hash fictício válido quando a identidade ou credencial não existe, reduzindo diferenças evidentes de tempo.

No sucesso, sessão e refresh token são persistidos na mesma transação. O JWT HS256 expira em 10 minutos e contém apenas `sub`, `sid`, `jti`, `iat`, `nbf`, `exp`, issuer e audience. A chave de no mínimo 256 bits vem exclusivamente de configuração externa. Endpoints autenticados revalidam User e sessão no MariaDB para garantir revogação imediata. Tenant ativo, roles e permissions não fazem parte do token.

## Refresh token e cookie

O refresh token possui 256 bits CSPRNG em Base64URL e somente seu SHA-256 é persistido. O cookie é `HttpOnly`, `SameSite=Lax`, limitado a `/api/v1/auth` e `Secure` fora de Development/Test. Seu nome é configurável. `POST /api/v1/auth/refresh` recebe o token apenas pelo cookie.

A sessão tem expiração absoluta inicial de 30 dias. Toda renovação bloqueia token e sessão, marca o token atual como usado, cria um sucessor na mesma família e preserva a expiração absoluta. Reutilizar um token usado revoga a família e a sessão. Em duas renovações concorrentes, no máximo uma cria sucessor; a segunda é tratada como reutilização e revoga também o sucessor. Essa decisão privilegia contenção de roubo, embora uma corrida legítima do cliente obrigue novo login.

## Sessões e identidade

- `POST /api/v1/auth/logout`: revoga a sessão identificada pelo cookie, é idempotente e expira o cookie;
- `POST /api/v1/auth/logout-all`: com Bearer válido, revoga todas as sessões do próprio User;
- `GET /api/v1/auth/me`: retorna identidade global e memberships mínimas para futura seleção de tenant;
- `GET /api/v1/auth/sessions`: lista somente sessões próprias, sem tokens ou hashes;
- `DELETE /api/v1/auth/sessions/{sessionId}`: revoga somente uma sessão pertencente ao User autenticado.

## Abuso, eventos e privacidade

O rate limit global é complementado por políticas de IP para login e refresh. Falhas são registradas por hash SHA-256 do e-mail normalizado e aplicam bloqueio temporário após cinco falhas em quinze minutos. O sucesso encerra a sequência considerada pela consulta. O limitador em memória deverá ser distribuído ou movido ao gateway antes de escala horizontal.

`security_events` registra apenas tipo, resultado, User/sessão opcionais, IP limitado e timestamp. Senha, hashes de senha, Authorization, cookie, access token, refresh token e hash do refresh não são metadados. IP possui limite de 45 caracteres e user agent de 255.

Endpoints mutáveis baseados em cookie validam `Origin` contra `Web:Origins`. CORS usa origens explícitas e credenciais; wildcard não é permitido. O frontend deve manter access token apenas em memória e enviar cookies pelo mesmo domínio lógico.

## Configuração

Variáveis `Authentication__Issuer`, `Authentication__Audience` e `Authentication__SigningKey` são obrigatórias. Validades, clock skew, cookie e bloqueio também são configuráveis conforme `.env.example`. Configuração ausente, chave curta ou validade insegura impede o startup. Segredos reais nunca pertencem ao repositório.

Execute `npm run db:migrate`, `npm test` e `npm run dev`. A migration `008` preserva o ledger Knex. Login visual, recuperação/troca de senha, MFA, tenant context, RBAC e cliente desktop permanecem futuros; domínio e serviços podem ser reutilizados por transporte desktop futuro sem expor refresh token em JSON.
