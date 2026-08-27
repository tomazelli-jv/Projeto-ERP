# Fundação técnica

## Escopo

A Etapa 1.1 estabelece um monorepo JavaScript executável, API HTTP segura, frontend integrado, conexão MariaDB, migrations, observabilidade básica, testes e integração contínua. Não contém autenticação nem entidades de negócio.

## Componentes

```text
Browser → Vite/React → /api proxy → Express → mysql2/promise → MariaDB
                                      └──── logs JSON/Pino
Deploy/CI → Knex CLI → migrations ─────────────────────────┘
```

Knex é utilizado exclusivamente pelo executor de migrations e seeds. A API utiliza diretamente o pool `mysql2/promise`; futuros repositories usarão SQL explícito e parametrizado.

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

- `/api/v1/health/live` indica que o processo HTTP está ativo;
- `/api/v1/health/ready` valida a conexão com o MariaDB e retorna `503` quando indisponível.

O readiness não expõe host, credenciais ou detalhes internos do erro.
