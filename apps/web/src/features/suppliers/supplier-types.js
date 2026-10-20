/** Contrato frontend de Fornecedores; documentos permanecem strings e preferências não geram contas.
 * @typedef {import('../customers/customer-types.js').CustomerType} SupplierPersonType
 * @typedef {import('../customers/customer-types.js').CustomerStatus} SupplierStatus
 * @typedef {import('../customers/customer-types.js').CustomerAddress} SupplierAddress
 * @typedef {{freightPercent:number|null,lastVisit:string,nextVisit:string,visitWeekDay:string,visitFrequencyDays:number|null,paymentTermDays:number|null}} SupplierFinancial
 * @typedef {{type:SupplierPersonType,status:SupplierStatus,name:string,legalName:string,tradeName:string,document:string,rg:string,registrationType:'COM INSC'|'SEM INSC'|'ISENTO',stateRegistration:string,municipalRegistration:string,registrationDate:string,supplierType:''|'Fabricante'|'Distribuidor',contactName:string,commercialContact:string,commercialEmail:string,commercialPhone:string,commercialNotes:string,email:string,phone:string,mobile:string,address:SupplierAddress,notes:string,financial:SupplierFinancial}} CreateSupplierInput
 * @typedef {CreateSupplierInput} UpdateSupplierInput
 * @typedef {CreateSupplierInput & {id:string,createdAt:string,updatedAt:string}} Supplier
 * @typedef {import('../customers/customer-types.js').CustomerListFilters} SupplierListFilters
 * @typedef {{list:(filters:SupplierListFilters)=>Promise<{items:Supplier[],total:number,page:number,pageSize:number}>,getById:(id:string)=>Promise<Supplier|null>,create:(data:CreateSupplierInput)=>Promise<Supplier>,update:(id:string,data:UpdateSupplierInput)=>Promise<Supplier>,setActive:(id:string,active:boolean)=>Promise<Supplier>,summary:()=>Promise<import('../customers/customer-types.js').CustomerSummary>}} SuppliersRepository
 */
export {};
