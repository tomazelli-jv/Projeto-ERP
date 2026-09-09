# ADR 0002 — Modelo central SaaS multi-tenant

Status: aceito.

## Decisões

- UUID v4 em `CHAR(36)` é a chave primária e identificador exposto das entidades SaaS.
- UUIDs são gerados por helper compartilhado no runtime; migrations não dependem de geração do banco.
- Status usam `VARCHAR` com schemas Zod e CHECK constraints nomeadas, evitando ENUM nativo.
- Relações internas de tenant usam foreign keys compostas para bloquear referências cross-tenant.
- CNPJ é texto alfanumérico normalizado em uppercase: as 12 primeiras posições aceitam A-Z/0-9 e os dois DVs são numéricos. Todo código futuro deve preservar letras; a aplicação valida os DVs e CHECK constraints protegem a estrutura armazenada.
- Valores de plan limits são inteiros não negativos, pois os limites atuais são contagens estruturais.
- Colunas geradas implementam unicidade condicional compatível com MariaDB para matriz, owner ativo e assinatura corrente.
- SQL de runtime permanece explícito e parametrizado em repositories com MySqlConnector/Dapper.

## Consequências

UUID textual ocupa mais espaço que uma chave binária, mas oferece interoperabilidade e operação mais simples nesta fase. Índices compostos são deliberadamente redundantes em alguns casos para que o próprio banco valide o tenant da relação.
