/** Contratos frontend-first: adapter futuro deve preservar as invariantes do domínio.
 * Datas civis: YYYY-MM-DD; timestamps: ISO; valores: centavos inteiros, nunca reais em float.
 * @typedef {'OPEN'|'PARTIAL'|'OVERDUE'|'PAID'|'CANCELED'} ReceivableStatus
 * @typedef {{customerId:string,description:string,document:string,issueDate:string,dueDate:string,totalCents:number,installmentCount:number,notes:string}} CreateReceivableInput
 * @typedef {{id:string,groupId:string,customerId:string,description:string,document:string,installmentNumber:number,installmentCount:number,issueDate:string,dueDate:string,originalAmountCents:number,origin:'MANUAL',canceledAt:string|null,notes:string,createdAt:string,updatedAt:string}} ReceivableTitle
 * @typedef {{receivedAt:string,amountAppliedCents:number,discountCents:number,interestCents:number,penaltyCents:number,paymentMethodId:string,notes:string}} ReceiveInput
 * @typedef {ReceiveInput & {id:string,receivableId:string,totalReceivedCents:number,createdAt:string}} ReceivablePayment
 * @typedef {{id:string,receivableId:string,action:string,createdAt:string}} ReceivableEvent
 * @typedef {ReceivableTitle & {customer:import('../customers/customer-types.js').Customer|null,balanceCents:number,status:ReceivableStatus,paymentCount:number}} ReceivableRow
 * @typedef {{customerId?:string,status?:ReceivableStatus,search?:string,dueFrom?:string,dueTo?:string,receivedFrom?:string,receivedTo?:string,page?:number,pageSize?:number}} ReceivableFilters
 * @typedef {{amount:number,count:number}} ReceivableMetric
 * @typedef {{due:ReceivableMetric,overdue:ReceivableMetric,received:ReceivableMetric,outstanding:ReceivableMetric}} ReceivableSummary
 * @typedef {{list:(filters:ReceivableFilters)=>Promise<{items:ReceivableRow[],total:number,page:number,pageSize:number}>,getById:(id:string)=>Promise<(ReceivableRow & {payments:ReceivablePayment[],history:ReceivableEvent[]})|null>,createInstallments:(data:CreateReceivableInput)=>Promise<ReceivableTitle[]>,update:(id:string,data:ReceivableTitle)=>Promise<ReceivableTitle>,cancel:(id:string)=>Promise<ReceivableTitle>,receive:(id:string,data:ReceiveInput)=>Promise<ReceivablePayment>,listPayments:(id:string)=>Promise<ReceivablePayment[]>,getSummary:(filters:ReceivableFilters)=>Promise<ReceivableSummary>}} ReceivablesRepository
 */
export {};
