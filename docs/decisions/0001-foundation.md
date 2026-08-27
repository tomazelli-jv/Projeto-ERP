# ADR 0001 — Fundação do monorepo

Status: aceito.

## Decisões

- npm workspaces para `apps/api`, `apps/web` e `packages/shared`;
- JavaScript com módulos ES;
- Express como API REST e React/Vite como cliente;
- Material UI, React Router e TanStack Query no frontend;
- MariaDB com InnoDB e `utf8mb4`;
- `mysql2/promise` no runtime da API;
- Knex restrito a migrations e seeds;
- Zod para configuração e futuras entradas HTTP;
- Pino com redação de campos sensíveis;
- migrations executadas separadamente do startup da API.

## Node.js

O projeto exige Node.js 22 ou superior e a CI utiliza Node.js 24 LTS. A implantação deve fixar uma versão LTS suportada pela Hostinger.

## Migration técnica inicial

`system_metadata` identifica a fundação do schema e permite registrar dados técnicos de ambiente sem introduzir entidades de negócio. Ela também comprova, nesta etapa, o ciclo completo de aplicação, consulta e reversão de migrations.
