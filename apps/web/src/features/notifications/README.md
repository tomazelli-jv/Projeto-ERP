# Notificações: integração pendente

O backend oficial não possui controller/DTO de notificações. A aplicação não consulta `/notifications/summary` hipotético e não calcula alertas de estoque ou inadimplência. `notifications-source.js` informa capacidade indisponível, sem dados fictícios ou persistência local de visualizações.

Implementados: sino junto ao perfil; popover agrupado; Central `/notifications`; filtros de categoria, não visualizados e críticos; expansão paginada sob demanda; cores semânticas; movimento reduzido. A mesma apresentação aceita novos tópicos sem componentes específicos por ocorrência.

Para habilitar dados reais, o responsável pelo backend precisa definir:

- endpoint de resumo autorizado por identidade, empresa, loja e permissões;
- tópicos com ID, categoria, quantidade, prioridade, resumo, destaque, destino, natureza derivada/evento e estado não visualizado;
- quantidade de **tópicos** não visualizados para o badge (`unreadTopicCount`);
- consulta de ocorrências por tópico paginada (20 por página), sem carregar registros completos no sino;
- autorização explícita `canViewAllStores` e escopo `current/all` sempre revalidado no servidor;
- contrato para confirmação de visualização e sua semântica para alertas derivados e eventos persistentes. Abrir o painel não marca nada silenciosamente;
- invalidação/atualização do resumo após eventos e alterações de permissões.

Os tipos de `notifications-source.js` descrevem o modelo da interface, não um contrato HTTP confirmado. Substituir o adapter nesse arquivo após confirmação; usar o client HTTP oficial. Não persistir uma notificação por título/produto para condições derivadas.

Query keys incluem usuário, empresa, loja e abrangência. Não há fallback ADM ou permissões inventadas. A opção todas as lojas aparece apenas mediante capacidade do serviço. O backend deve filtrar os tópicos antes de responder; esconder controles no frontend não substitui autorização.

Destinos são validados por allowlist. Atualmente somente `/financial/receivables?status=OVERDUE` (e demais status existentes) tem filtro compatível. Produtos/lotes, contas a pagar e metas dependem de contratos e filtros ainda ausentes; não se simulam essas navegações. Ocorrências continuam consultáveis pela Central quando existir o serviço.

Validação: `node --test tests/notifications.test.mjs`. Nenhuma dependência nova, alteração backend ou mock permanente.
