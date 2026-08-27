# ADR 0003 — Credencial global e senha inicial

Status: aceito.

## Decisões

- credencial separada da identidade em `user_credentials`, com relação única ao User global;
- Argon2id no formato PHC, configurado centralmente;
- token aleatório de 256 bits, persistido somente por SHA-256;
- finalidade única `initial_password` e validade inicial de 24 horas;
- consumo transacional com bloqueio pessimista e unicidade como defesa adicional;
- estados privados do token unificados na resposta HTTP;
- entrega por interface injetável, sem provedor real nesta etapa;
- onboarding não recebe senha e não altera credencial existente;
- endpoint público de reemissão adiado até existir entrega real e proteção operacional correspondente.

## Consequências

Consultas comuns de User não carregam hashes. Uma futura troca de parâmetros pode usar as informações contidas no próprio hash. A entrega real precisará definir retentativa confiável; até lá, o adaptador padrão é deliberadamente inerte e a emissão permanece testável sem SMTP fictício.
