# Onboarding transacional

## Lifecycle

O endpoint público `POST /api/v1/onboarding` cria, nesta ordem:

1. valida e normaliza o payload;
2. abre uma conexão e inicia uma transação;
3. localiza e bloqueia para leitura o plano público ativo;
4. valida `max_companies`, `max_branches` e `max_users`;
5. cria Tenant ativo;
6. cria Company ativa com a raiz do CNPJ;
7. cria a Branch matriz ativa com o CNPJ completo;
8. cria o endereço fiscal, quando informado;
9. localiza ou cria a identidade global do owner;
10. cria o Tenant Membership ativo e owner;
11. caso o User ainda não possua credencial, revoga tokens anteriores e cria um novo token de definição inicial;
12. cria a Subscription em trial;
13. confirma a transação;
14. entrega o token pela fronteira de notificação substituível, sem incluí-lo na resposta HTTP.

Qualquer erro executa rollback antes da conexão ser liberada. Os repositories recebem a conexão existente e não iniciam, confirmam ou revertem transações.

## CNPJ e concorrência

O CNPJ é normalizado, validado e armazenado somente com dígitos. Company recebe os oito primeiros dígitos em `tax_id_root`; Branch recebe o CNPJ completo. Uma unique constraint global em `branches.tax_id` é a última linha de defesa contra dois onboardings simultâneos do mesmo estabelecimento.

Slug e e-mail também dependem de constraints únicas. Erros conhecidos do MariaDB são convertidos em erros de domínio seguros, sem SQL ou nomes de constraints na resposta.

## Identidade global

Se o e-mail normalizado já existir, o User é reutilizado e seus dados globais não são sobrescritos. Somente um novo Tenant Membership é criado. Em uma corrida de criação do mesmo e-mail, a constraint global decide o vencedor e o segundo fluxo recarrega a identidade existente.

## Plano e trial

O cliente informa apenas `planCode`; IDs e limites não são aceitos. O plano precisa estar ativo, público e possuir os três limites estruturais com valor mínimo 1.

O trial atual dura 14 dias. Esse período é um placeholder comercial centralizado e será configurável futuramente. Não existe cobrança nesta etapa.

## Credencial existente

O User global é bloqueado antes da verificação da credencial. Um User novo ou existente sem credencial recebe um novo token; tokens ativos anteriores da mesma finalidade são revogados. Um User com credencial mantém a senha, o nome e o telefone intactos e não recebe outro token. Falha durante a emissão ou persistência do token desfaz todo o onboarding.

A entrega ocorre somente após o commit, evitando notificação de dados revertidos. Falha do adaptador é registrada sem segredo e não transforma uma transação já confirmada em aparente rollback. Um mecanismo operacional de reenvio será ligado quando houver provedor real.

## Repetição e autenticação

Não há idempotency key formal. Uma submissão repetida falha previsivelmente por slug ou CNPJ duplicado e sofre rollback integral.

O onboarding não recebe nem cria senha, JWT, cookie ou sessão. Ele cria somente o token de uso único para definição posterior da senha. Login será implementado em uma etapa posterior.
