# ADR 0005 — JWT curto, refresh rotativo e sessão persistida

Status: aceito.

## Decisão

Usar JWT HS256 de 10 minutos com issuer/audience e chave externa de pelo menos 256 bits. Persistir sessões globais com limite absoluto de 30 dias. Entregar refresh token CSPRNG de 256 bits somente em cookie HttpOnly e persistir apenas SHA-256. Rotacionar a cada uso, ligar tokens por família e revogar família e sessão quando houver reutilização.

Cada requisição Bearer valida criptografia e claims e consulta a sessão/User, garantindo revogação imediata antes da futura autorização contextual. Operações compostas usam SQL parametrizado, transação da aplicação e locks `FOR UPDATE`; repositories não confirmam nem revertem transações.

## Consequências

A consulta de sessão aumenta o custo dos endpoints autenticados, escolhido nesta fase em favor da revogação imediata. Corridas com o mesmo refresh token invalidam a sessão inteira, exigindo coordenação do cliente. Escala horizontal futura exigirá rate limiter distribuído, mas não muda o modelo persistido. RBAC e tenant context ficam fora do JWT e serão tratados na Etapa 1.6.
