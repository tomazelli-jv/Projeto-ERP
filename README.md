# Tomazelli ERP

ERP SaaS comercial multi-tenant da Tomazelli.dev. O backend oficial é ASP.NET Core em .NET 10, com MariaDB 11.8 e SQL explícito via MySqlConnector/Dapper. O cliente web permanece React/Vite.

O escopo atual contém fundação técnica, modelo SaaS, onboarding transacional, definição segura da senha inicial e autenticação global com JWT curto, refresh rotativo e sessões persistidas. RBAC, contexto ativo de tenant e módulos operacionais ainda não fazem parte do produto.

## Requisitos

- SDK .NET 10 LTS;
- Node.js 24 LTS e npm 10 ou superior para o frontend;
- Docker com Docker Compose para o MariaDB local.

## Instalação

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

No Windows PowerShell, use `Copy-Item .env.example .env`. Variáveis do arquivo devem ser disponibilizadas ao processo .NET pela IDE, terminal ou hospedagem; nenhum segredo é carregado ou versionado automaticamente.

Serviços locais:

- Frontend: `http://localhost:5173`;
- API ASP.NET Core: `http://localhost:5001`;
- Liveness: `http://localhost:5001/health/live`;
- Readiness: `http://localhost:5001/health/ready`.

## Comandos

| Comando                 | Função                                         |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Executa API ASP.NET Core e frontend React      |
| `npm run dev:api`       | Executa somente a API ASP.NET Core             |
| `npm run dev:web`       | Executa somente o frontend                     |
| `npm run build`         | Compila backend e frontend                     |
| `npm run lint`          | Executa ESLint no frontend                     |
| `npm run format:check`  | Verifica a formatação                          |
| `npm test`              | Executa a suíte .NET                           |
| `npm run test:coverage` | Executa a suíte .NET com cobertura             |
| `npm run db:up`         | Inicia MariaDB 11.8                            |
| `npm run db:down`       | Interrompe o ambiente Compose                  |
| `npm run db:migrate`    | Aplica migrations pelo runner .NET             |
| `npm run db:rollback`   | Reverte o último lote pelo runner .NET         |
| `npm run db:status`     | Exibe o ledger compartilhado `knex_migrations` |
| `npm run db:seed`       | Seed com `DOTNET_ENVIRONMENT=Development`      |

## Estrutura

- `backend/src/ERP.Api`: API HTTP oficial;
- `backend/src/ERP.Application`: contratos da aplicação;
- `backend/src/ERP.Domain`: regras de domínio;
- `backend/src/ERP.Infrastructure`: MariaDB, segurança e workflows;
- `backend/src/ERP.Migrations`: runner e seed de desenvolvimento;
- `backend/tests`: testes unitários e de integração;
- `apps/web`: aplicação React/Vite;
- `database/migrations`: fontes históricas 001–007 preservadas como referência;
- `docs`: arquitetura, decisões e operação.

A API nunca executa migrations no startup. Configure MariaDB por `ConnectionStrings__MariaDb` e mantenha credenciais reais exclusivamente em variáveis de ambiente.

Autenticação exige também `Authentication__Issuer`, `Authentication__Audience` e `Authentication__SigningKey`; a chave deve ser aleatória, possuir no mínimo 32 bytes e existir somente no ambiente. O refresh token nunca é devolvido em JSON.

Consulte [migrações ASP.NET](docs/operations/aspnet-migrations.md), [onboarding](docs/architecture/onboarding.md), [definição inicial de senha](docs/architecture/password-setup.md), [autenticação e sessões](docs/architecture/authentication-sessions.md) e o [ADR de tokens e sessões](docs/decisions/0005-access-refresh-sessions.md).
