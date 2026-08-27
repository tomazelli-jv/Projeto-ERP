# Multi-tenancy SaaS

## Isolamento

`tenants` representa a conta contratante. Toda entidade pertencente ao cliente carrega `tenant_id` para permitir filtragem direta, índices eficientes e validação de isolamento sem depender de joins longos.

As relações críticas repetem `tenant_id` de forma intencional. Uma Branch referencia Company pela chave composta `(tenant_id, company_id)`, e um endereço referencia Branch por `(tenant_id, branch_id)`. Assim, o MariaDB rejeita associações cross-tenant mesmo que a aplicação tenha um defeito.

Índices de consultas contextuais começam por `tenant_id`. Uma futura camada autenticada deverá construir um tenant context no backend e nunca aceitar livremente o tenant informado pelo frontend. Essa camada não faz parte desta etapa.

## Company versus Branch

- **Company** é a entidade empresarial lógica dentro do tenant.
- **Branch** é um estabelecimento fiscal da Company.
- A matriz também é uma Branch, marcada com `is_headquarters = true`.

O CNPJ completo pertence à Branch. Company possui apenas a raiz opcional de oito dígitos, evitando duplicar o CNPJ da matriz. Uma coluna gerada e uma unique constraint asseguram no banco no máximo uma matriz por Company.

## Users e memberships

User é uma identidade global, com e-mail normalizado em lowercase antes da persistência. Nenhuma senha ou credencial existe nesta etapa.

Tenant Membership representa a participação de um User em um Tenant. `(tenant_id, user_id)` é único, permitindo que uma pessoa participe de vários tenants sem duplicar sua identidade. `is_owner` representa somente propriedade estrutural e não substitui RBAC. Uma coluna gerada garante no máximo um owner com membership ativo por tenant.

## Plans, limits e subscriptions

Plan é uma definição global da plataforma. Plan Limit armazena os três limites estruturais quantitativos desta etapa como `BIGINT UNSIGNED`: `max_companies`, `max_branches` e `max_users`. Essa representação é simples, segura para contagem e extensível para novos limites quantitativos. Limites booleanos ou textuais exigirão modelagem própria quando houver um caso real, em vez de misturar tipos prematuramente.

Subscription registra o histórico de contratação de um Plan pelo Tenant. Estados `trialing`, `active` e `suspended` são considerados correntes. Uma coluna gerada que contém o tenant apenas nesses estados, combinada com índice único, impede duas assinaturas correntes conflitantes e permite múltiplas assinaturas históricas `cancelled` ou `expired`.

Não há cobrança, preço, invoice, gateway ou renovação automática.

## Segurança futura

Autenticação, sessões, JWT, roles e permissions serão implementados em uma etapa posterior. Até que autenticação e autorização existam, nenhuma rota sensível ou CRUD público deve ser adicionado. O modelo de banco não constitui, isoladamente, controle de acesso.
