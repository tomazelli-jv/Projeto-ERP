# Tomazelli ERP

> Migração incremental: o frontend React/Vite e o backend Node/Express continuam ativos. A nova
> API ASP.NET Core está sendo construída em paralelo e ainda não atende onboarding nem autenticação.

## Backend ASP.NET Core

Requer o SDK .NET 10 LTS. A API .NET usa a porta `http://localhost:5001`, distinta da API Node na
porta 3000. Seus health checks são `GET /health/live` e `GET /health/ready`.

```bash
dotnet restore backend/ERP.sln --configfile NuGet.Config
dotnet build backend/ERP.sln --no-restore
dotnet test backend/ERP.sln --no-build
dotnet run --project backend/src/ERP.Api
```

Configure MariaDB por `ConnectionStrings__MariaDb`; credenciais reais não devem ser armazenadas no
Git. Veja [a arquitetura da migração](docs/architecture/dotnet-backend-migration.md) e o
[ADR da stack .NET](docs/decisions/0004-dotnet-backend-stack.md).

ERP SaaS comercial multi-tenant da Tomazelli.dev. A base atual contém a fundação executável, o modelo central SaaS e a definição segura da senha inicial da identidade global. Login, sessão e módulos operacionais ainda não fazem parte do código.

## Requisitos

- Node.js 24 LTS ou versão LTS posterior compatível;
- npm 10 ou superior;
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

No Windows PowerShell, copie o ambiente com:

```powershell
Copy-Item .env.example .env
```

Serviços locais:

- Frontend: `http://localhost:5173`;
- API: `http://localhost:3000`;
- Liveness: `http://localhost:3000/api/v1/health/live`;
- Readiness: `http://localhost:3000/api/v1/health/ready`.

## Comandos

| Comando                 | Função                                      |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Executa API e frontend                      |
| `npm run dev:api`       | Executa somente a API                       |
| `npm run dev:web`       | Executa somente o frontend                  |
| `npm run build`         | Gera os builds dos workspaces               |
| `npm run lint`          | Executa o ESLint                            |
| `npm run format`        | Formata o repositório                       |
| `npm run format:check`  | Verifica a formatação                       |
| `npm test`              | Executa os testes                           |
| `npm run test:coverage` | Executa testes com cobertura                |
| `npm run db:up`         | Inicia o MariaDB                            |
| `npm run db:down`       | Interrompe o ambiente Compose               |
| `npm run db:migrate`    | Aplica migrations pendentes                 |
| `npm run db:rollback`   | Reverte o último lote                       |
| `npm run db:status`     | Exibe o estado das migrations               |
| `npm run db:seed`       | Executa seeds exclusivamente em development |

## Estrutura

- `apps/api`: API Express e infraestrutura HTTP;
- `apps/web`: aplicação React;
- `packages/shared`: contratos e constantes realmente compartilhados;
- `database`: migrations e seeds;
- `docs`: arquitetura, decisões e operação.

Consulte [a arquitetura](docs/architecture/foundation.md), [as decisões](docs/decisions/0001-foundation.md) e [o procedimento de banco](docs/operations/database.md).

O modelo multi-tenant está documentado em [Multi-tenancy SaaS](docs/architecture/multi-tenancy.md).

O fluxo atômico de cadastro inicial está documentado em [Onboarding transacional](docs/architecture/onboarding.md).

A credencial global e o consumo único do token estão documentados em [Definição inicial de senha](docs/architecture/password-setup.md).
