# ADR 0004: stack do novo backend .NET

- Status: aceita
- Data: 2026-08-27

## Contexto

O ERP precisa substituir gradualmente o backend Express sem interromper o frontend React, preservar MariaDB e permitir que clientes Web e Desktop compartilhem as mesmas regras oficiais.

## Decisão

Adotar .NET 10 LTS, C#, ASP.NET Core Web API, Dapper e MySqlConnector. Manter MariaDB 11.8 e React. O backend Node foi mantido somente durante a comprovação de equivalência e removido no corte definitivo. Separar a solução em Api, Application, Domain e Infrastructure, mais testes unitários e de integração.

## Consequências e trade-offs

A separação mantém Domain/Application independentes de HTTP e facilita clientes adicionais. Dapper preserva SQL explícito e controle transacional, mas exige mapeamento e evolução de schema manuais. O custo temporário de duas stacks terminou com o corte. Rate limiting em memória não coordena múltiplas instâncias e deverá ser substituído ou movido para gateway antes de escala horizontal. O runner .NET preserva o ledger Knex existente sem depender do runtime Node.
