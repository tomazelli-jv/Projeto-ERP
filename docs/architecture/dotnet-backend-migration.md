# Migração incremental do backend para .NET

## Motivo

O backend do ERP foi migrado de Node.js/Express para C# e ASP.NET Core. A equivalência foi comprovada na branch de migração contra MariaDB 11.8 antes da remoção do Express.

## O que permanece

- React, Vite, Material UI, React Router e TanStack Query;
- MariaDB 11.8 e o schema atual;
- ledger histórico `knex_migrations` e identificadores 001–007;
- contratos HTTP validados durante a migração.

O frontend React/Vite foi preservado e usa a API ASP.NET Core pelo proxy `/api`.

## Arquitetura

```text
React Web ─────┐
               ├─> ASP.NET Core API -> Application -> Domain
Desktop futuro ┘                         └──────────> Infrastructure -> MariaDB
```

`ERP.Domain` contém regras puras e não conhece HTTP, banco ou clientes. `ERP.Application` coordena casos de uso e contratos. `ERP.Infrastructure` implementa MariaDB com Dapper/MySqlConnector. `ERP.Api` é a composição HTTP, com controllers/endpoints finos.

React é apenas um cliente. Um futuro cliente Desktop (WPF, WinUI, Avalonia ou outra tecnologia a ser decidida) será outro cliente da mesma API. Validações duplicadas no frontend servem apenas à UX; o backend é sempre a autoridade.

Integrações locais com impressora térmica, balança, leitor, gaveta, certificado digital, porta serial ou impressora de etiquetas não pertencem ao Domain. Quando necessárias, devem ficar em um cliente Desktop, Local Agent ou serviço auxiliar.

## Banco, conexões e transações

A conexão obrigatória usa `ConnectionStrings:MariaDb`, normalmente configurada pela variável `ConnectionStrings__MariaDb`. Produção não possui valor padrão. `MySqlDataSource` é singleton e a factory abre uma conexão por operação. Repositórios futuros devem aceitar a mesma conexão e transação iniciadas pelo application service:

```text
Application service -> Open connection -> Begin transaction
                    -> repositories(connection, transaction) -> Commit/Rollback
```

Não será introduzido um Unit of Work genérico sem necessidade.

## Health, HTTP e operação

- `GET /health/live`: confirma somente que o processo responde;
- `GET /health/ready`: executa `SELECT 1` (não há entrada externa a parametrizar);
- rotas futuras de negócio manterão `/api/v1/`;
- JSON público usa camelCase e datas futuras deverão ser UTC/ISO-8601;
- erros possuem status HTTP, código estável, mensagem pública e request ID;
- `X-Request-Id` seguro (até 128 caracteres) é aceito; caso contrário, um ID é gerado;
- logging estruturado nativo usa scopes com request ID e não registra connection strings;
- CORS usa `Web:Origins`, sem wildcard de produção;
- rate limiting local usa janela fixa; antes de escala horizontal será necessário um mecanismo distribuído ou enforcement no gateway;
- headers `nosniff`, `no-referrer` e `DENY` formam a baseline da API. CSP não é aplicada à API JSON;
- OpenAPI não é exposto nesta etapa.

## Migrations

O runner .NET é a única ferramenta executável de migrations. Ele reutiliza `knex_migrations` e `knex_migrations_lock`, reconhece os nomes exatos 001–007 aplicados anteriormente pelo Knex e não mantém uma segunda tabela de histórico. As fontes JavaScript históricas permanecem somente para auditoria; Knex não é uma dependência do projeto.

## Critério para remover o backend Node

Node/Express foi removido após onboarding, definição inicial de senha, migrations e persistência permanecerem verdes no CI com MariaDB 11.8. Login e demais módulos continuam fora do escopo.
