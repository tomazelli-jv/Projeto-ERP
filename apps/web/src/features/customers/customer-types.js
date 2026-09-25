/** Contrato frontend independente de DTOs futuros. Datas são strings ISO; documentos nunca números.
 * @typedef {'PERSON'|'COMPANY'} CustomerType
 * @typedef {'ACTIVE'|'INACTIVE'} CustomerStatus
 * @typedef {{cep:string, street:string, number:string, complement:string, neighborhood:string, city:string, state:string}} CustomerAddress
 * @typedef {{type:CustomerType,status:CustomerStatus,name:string,legalName:string,tradeName:string,document:string,birthDate:string,rg:string,registrationDate:string,registrationType:"COM INSC"|"SEM INSC"|"ISENTO",taxpayerType:"1"|"2"|"9",financial:{allowReceivables:boolean,creditLimit:number},stateRegistration:string,municipalRegistration:string,contactName:string,email:string,phone:string,mobile:string,address:CustomerAddress,notes:string}} CreateCustomerInput
 * @typedef {CreateCustomerInput} UpdateCustomerInput
 * @typedef {CreateCustomerInput & {id:string,createdAt:string,updatedAt:string}} Customer
 * @typedef {{search?:string,type?:CustomerType|'',status?:CustomerStatus|'',city?:string,state?:string,page:number,pageSize:number}} CustomerListFilters
 * @typedef {{items:Customer[],total:number,page:number,pageSize:number}} CustomerListResult
 * @typedef {{total:number,active:number,persons:number,companies:number}} CustomerSummary
 * @typedef {{list:(filters:CustomerListFilters)=>Promise<CustomerListResult>,getById:(id:string)=>Promise<Customer|null>,create:(data:CreateCustomerInput)=>Promise<Customer>,update:(id:string,data:UpdateCustomerInput)=>Promise<Customer>,setActive:(id:string,active:boolean)=>Promise<Customer>,summary:()=>Promise<CustomerSummary>}} CustomersRepository
 */
export {};
