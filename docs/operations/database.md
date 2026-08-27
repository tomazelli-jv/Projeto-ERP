# Operação do banco de dados

## Desenvolvimento

Crie `.env` a partir de `.env.example`, inicie o MariaDB e aplique migrations:

```bash
npm run db:up
npm run db:migrate
npm run db:status
```

O volume `mariadb_data` preserva os dados quando o container é interrompido. `npm run db:down` não remove esse volume.

## Seeds

Os seeds registram metadados técnicos e os planos globais STARTER, PRO e BUSINESS com limites fictícios de desenvolvimento. Esses nomes e limites não representam a política comercial final. O executor exige explicitamente `NODE_ENV=development` e falha em staging ou production.

## Produção

1. Criar backup antes da implantação;
2. Executar `npm ci` e validar o build;
3. Configurar as variáveis de banco sem valores locais padrão;
4. Executar `npm run db:status`;
5. Executar `npm run db:migrate` como etapa separada;
6. Iniciar ou reiniciar a API;
7. Validar os endpoints de liveness e readiness.

A API nunca executa migrations ao iniciar. Rollback deve ser usado somente após avaliação da migration e backup confirmado.

## Pendência externa

Docker não estava disponível na máquina durante a criação da fundação. O Compose deve ser executado após instalar Docker Desktop. A versão e os recursos da Hostinger também precisam ser confirmados antes da implantação.
