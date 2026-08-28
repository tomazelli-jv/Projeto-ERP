# Fundação técnica

## Escopo

A fundação estabelece uma API ASP.NET Core, frontend React integrado, conexão MariaDB, migrations, observabilidade básica, testes e integração contínua. Login e módulos operacionais ainda não fazem parte do escopo.

## Componentes

```text
Browser → Vite/React → /api proxy → ASP.NET Core → MySqlConnector/Dapper → MariaDB
                                      └──── logs estruturados
Deploy/CI → runner .NET → migrations ───────────────────────┘
```

O runner .NET controla migrations no ledger histórico `knex_migrations`. A API e os repositories usam SQL explícito e parametrizado; Entity Framework não é utilizado.

## Respostas HTTP

Sucesso:

```json
{ "data": {} }
```

Erro:

```json
{
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Mensagem segura para o usuário.",
    "requestId": "identificador-da-requisição"
  }
}
```

## Health checks

- `/health/live` indica que o processo HTTP está ativo;
- `/health/ready` valida a conexão com o MariaDB e retorna `503` quando indisponível.

O readiness não expõe host, credenciais ou detalhes internos do erro.
