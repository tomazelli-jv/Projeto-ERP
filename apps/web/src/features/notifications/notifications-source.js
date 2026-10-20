// Capacidade ausente no backend atual. Não consulta uma rota hipotética nem apresenta vazio como sucesso.
// O adapter real deverá fornecer somente tópicos autorizados e detalhes paginados pelo servidor.
export const notificationsSource = {
  async summary() {
    return { available: false, topics: [], unreadTopicCount: 0, canViewAllStores: false };
  },
  async occurrences() {
    throw Error('A consulta de ocorrências depende da integração de notificações.');
  }
};

/** Modelo de apresentação, não contrato HTTP presumido.
 * @typedef {{id:string,title:string,description:string}} NotificationHighlight
 * @typedef {{id:string,category:string,label:string,count:number,severity:'critical'|'warning'|'success'|'info',unseen:boolean,summary:string,highlight:NotificationHighlight|null,actionUrl:string|null,kind:'derived'|'event'}} NotificationTopic
 * @typedef {{available:boolean,topics:NotificationTopic[],unreadTopicCount:number,canViewAllStores:boolean}} NotificationsSummary
 * @typedef {{items:NotificationHighlight[],page:number,totalPages:number,total:number}} NotificationOccurrences
 */
