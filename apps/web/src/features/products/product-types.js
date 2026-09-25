/** Modelo frontend sem contrato HTTP presumido. Dinheiro é centavos inteiros, códigos são strings.
 * @typedef {'PRODUCT'|'SERVICE'} CatalogItemType
 * @typedef {'ACTIVE'|'INACTIVE'} ProductStatus
 * @typedef {string} UnitOfMeasure
 * @typedef {string} ProductCategory
 * @typedef {{name:string,code:string,category:ProductCategory,description:string,priceCents:number,status:ProductStatus,unit:UnitOfMeasure}} CatalogBase
 * @typedef {CatalogBase & {type:'PRODUCT',gtin:string,ncm:string,brand:string,manufacturerReference:string,costCents:number|null,trackStock:boolean,minimumStock:string}} Product
 * @typedef {CatalogBase & {type:'SERVICE',durationMinutes:string,serviceDescription:string}} Service
 * @typedef {Product|Service} CreateCatalogItemInput
 * @typedef {CreateCatalogItemInput} UpdateCatalogItemInput
 * @typedef {CreateCatalogItemInput & {id:string,createdAt:string,updatedAt:string}} CatalogItem
 * @typedef {{search?:string,type?:CatalogItemType|'',status?:ProductStatus|'',category?:string,unit?:string,page:number,pageSize:number}} ProductListFilters
 * @typedef {{list:(filters:ProductListFilters)=>Promise<{items:CatalogItem[],total:number,page:number,pageSize:number}>,getById:(id:string)=>Promise<CatalogItem|null>,create:(data:CreateCatalogItemInput)=>Promise<CatalogItem>,update:(id:string,data:UpdateCatalogItemInput)=>Promise<CatalogItem>,setActive:(id:string,active:boolean)=>Promise<CatalogItem>,summary:()=>Promise<{total:number,products:number,services:number,active:number}>}} ProductsRepository
 */
export {};
