# Definição inicial de senha

## Modelo

`user_credentials` separa a identidade global da credencial. Há exatamente uma linha por User, protegida por `UNIQUE(user_id)`, contendo apenas o hash Argon2id e timestamps. A separação reduz a exposição do hash em consultas de identidade e deixa clara a futura evolução dos métodos de autenticação sem criar abstrações não utilizadas.

`password_setup_tokens` pertence ao User global e registra identificador UUID, hash SHA-256, finalidade `initial_password`, expiração, utilização, revogação e timestamps. O hash usa collation binária ASCII e unicidade global. O token bruto contém 32 bytes gerados por `crypto.randomBytes` (256 bits) e nunca é persistido. SHA-256 é adequado aqui porque a entrada já é aleatória e possui alta entropia; Argon2id fica reservado a senhas humanas de baixa entropia.

A exclusão de User elimina tokens efêmeros por cascade. Credenciais usam `RESTRICT`, exigindo uma decisão explícita antes de apagar uma identidade autenticável.

## Argon2id e política

Os parâmetros centralizados são:

- memória: 19.456 KiB;
- iterações: 2;
- paralelismo: 1;
- saída: 32 bytes;
- salt: gerado internamente e único pelo Argon2.

O perfil segue a recomendação de segurança de usar memória significativa e mantém tempo e memória compatíveis com runners de CI e pequenos ambientes de produção. O formato PHC gravado pelo Argon2 inclui algoritmo, versão, parâmetros e salt, permitindo verificar hashes existentes e detectar futuramente a necessidade de rehash. Os valores são configuráveis por ambiente, com mínimos validados.

A senha possui de 12 a 128 caracteres JavaScript, aceita espaços e frases-senha, rejeita conteúdo composto somente por espaços e não exige composição artificial. A senha não sofre `trim`, normalização ou alteração silenciosa. O limite superior contém abuso de CPU e memória. Não há consulta de senha vazada nesta etapa.

## Emissão e entrega

O onboarding bloqueia o User, verifica a ausência de credencial, revoga tokens ativos anteriores e persiste um novo hash dentro da mesma transação das entidades SaaS. A validade inicial é de 24 horas, centralizada e ajustável por configuração. User existente sem credencial participa do mesmo fluxo; User com credencial não recebe token e nunca tem a senha substituída.

Somente `PasswordSetupTokenService` conhece temporariamente o token bruto. `PasswordSetupNotifier` é a fronteira substituível de entrega e atualmente não envia e-mail; testes injetam um test double. Não há SMTP fictício, fila ou outbox. O adaptador real será ligado em etapa posterior. O token nunca aparece na resposta pública do onboarding, em consultas ou logs.

Não foi criado `POST /api/v1/auth/password/setup/request`: o onboarding é a única origem necessária nesta etapa. Uma reemissão pública acrescentaria superfície de abuso antes da integração real de e-mail. Quando implementada, deverá responder de modo idêntico para e-mails existentes e inexistentes.

## Confirmação e concorrência

`POST /api/v1/auth/password/setup/confirm` aceita somente `token` e `password` em objeto strict. O service calcula SHA-256 antes da consulta e executa:

1. inicia a transação;
2. encontra e bloqueia o token com `FOR UPDATE`;
3. valida finalidade, expiração, uso e revogação;
4. bloqueia o User e confirma que a credencial não existe;
5. gera o hash Argon2id;
6. insere a credencial;
7. marca exatamente uma linha de token como utilizada;
8. revoga outros tokens ativos da mesma finalidade;
9. confirma ou reverte integralmente;
10. sempre libera a conexão.

O bloqueio do token serializa confirmações concorrentes. A unicidade da credencial é a defesa final contra duas linhas para o mesmo User. Apenas uma confirmação pode produzir sucesso.

## Resposta pública e observabilidade

Sucesso retorna apenas `{ "data": { "passwordDefined": true } }`. Token inexistente, expirado, utilizado, revogado ou de finalidade incorreta mantém códigos internos distintos, mas é convertido na borda HTTP para `PASSWORD_SETUP_TOKEN_INVALID` e mensagem genérica. Isso reduz vazamento do estado do token. `PASSWORD_ALREADY_DEFINED` permanece um conflito de domínio e a política inválida não ecoa a senha.

Logs contêm somente evento, request ID, User ID quando conhecido e código seguro. Senha, token bruto, hash SHA-256, hash Argon2id e corpo HTTP não são registrados. A infraestrutura formal de auditoria ainda não existe; os eventos estruturados são pontos de integração, não um subsistema paralelo.

## Fora da Etapa 1.4

Não foram implementados login, JWT, refresh token, cookie, sessão, logout, recuperação de senha, RBAC, frontend ou envio real de e-mail. Login futuro poderá verificar o formato PHC pela mesma abstração; recuperação de senha deverá usar finalidade e fluxo próprios, sem reutilizar o token inicial.
