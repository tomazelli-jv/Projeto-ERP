# ADR 0002 — Modelo central SaaS multi-tenant

Status: aceito.

## Decisões

- UUID v4 em `CHAR(36)` é a chave primária e identificador exposto das entidades SaaS.
- UUIDs são gerados por helper compartilhado no runtime; migrations não dependem de geração do banco.
- Status usam `VARCHAR` com schemas Zod e CHECK constraints nomeadas, evitando ENUM nativo.
- Relações internas de tenant usam foreign keys compostas para bloquear referências cross-tenant.
- CNPJ é persistido apenas com dígitos e validado na aplicação; CHECK constraints protegem o formato armazenado.
- Valores de plan limits são inteiros não negativos, pois os limites atuais são contagens estruturais.
- Colunas geradas implementam unicidade condicional compatível com MariaDB para matriz, owner ativo e assinatura corrente.
- SQL de runtime permanece explícito e parametrizado em repositories com `mysql2/promise`.

## Consequências

UUID textual ocupa mais espaço que uma chave binária, mas oferece interoperabilidade e operação mais simples nesta fase. Índices compostos são deliberadamente redundantes em alguns casos para que o próprio banco valide o tenant da relação.
