# Migração incremental do backend para .NET

## Motivo

O backend do ERP será migrado de Node.js/Express para C# e ASP.NET Core para consolidar uma API client-agnostic, mantendo regras de negócio independentes da camada HTTP. A substituição é gradual: o Express permanece como implementação funcional de referência até haver paridade comprovada.

## O que permanece

- React, Vite, Material UI, React Router e TanStack Query;
- MariaDB 11.8 e o schema atual;
- migrations e seeds Knex;
- contratos HTTP existentes durante a migração;
- backend Node e seus testes enquanto a migração estiver em curso.

O frontend não foi migrado e ainda não consome a nova API.

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

Knex continua como histórico oficial e única ferramenta que aplica migrations. A transição futura deve registrar um baseline equivalente à última migration Knex em cada ambiente e iniciar apenas novas migrations em uma ferramenta .NET madura (por exemplo, DbUp ou FluentMigrator). O runner .NET deverá verificar o baseline antes de executar e nunca converter/reaplicar scripts históricos. A troca só ocorrerá após ensaio em cópia de banco, documentação de rollback e validação em CI/MariaDB real.

## Critério para remover o backend Node

Node/Express só será removido depois que todas as funcionalidades relevantes forem portadas, tiverem testes equivalentes, forem validadas contra MariaDB real e permanecerem verdes no CI. Esta fundação não porta onboarding, autenticação nem módulos operacionais.
