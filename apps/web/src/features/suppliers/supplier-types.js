/** Tipos de fornecedor compartilham o endereço e o contato base, sem dados bancários.
 * @typedef {import('../customers/customer-types.js').CustomerType} SupplierType
 * @typedef {import('../customers/customer-types.js').CustomerStatus} SupplierStatus
 * @typedef {import('../customers/customer-types.js').CustomerAddress} SupplierAddress
 * @typedef {Omit<import('../customers/customer-types.js').CreateCustomerInput,'birthDate'> & {commercialContact:string,commercialEmail:string,commercialPhone:string,commercialNotes:string}} CreateSupplierInput
 * @typedef {CreateSupplierInput} UpdateSupplierInput
 * @typedef {CreateSupplierInput & {id:string,createdAt:string,updatedAt:string}} Supplier
 * @typedef {import('../customers/customer-types.js').CustomerListFilters} SupplierListFilters
 * @typedef {{list:(filters:SupplierListFilters)=>Promise<{items:Supplier[],total:number,page:number,pageSize:number}>,getById:(id:string)=>Promise<Supplier|null>,create:(data:CreateSupplierInput)=>Promise<Supplier>,update:(id:string,data:UpdateSupplierInput)=>Promise<Supplier>,setActive:(id:string,active:boolean)=>Promise<Supplier>,summary:()=>Promise<import('../customers/customer-types.js').CustomerSummary>}} SuppliersRepository
 */
export {};
