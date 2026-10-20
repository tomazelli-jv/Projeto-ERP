/** Modelo frontend sem contrato HTTP presumido. Dinheiro é centavos inteiros, códigos são strings.
 * @typedef {'PRODUCT'|'SERVICE'} CatalogItemType
 * @typedef {'ACTIVE'|'INACTIVE'} ProductStatus
 * @typedef {string} UnitOfMeasure
 * @typedef {string} ProductCategory
 * @typedef {{cest?:string,origin?:string,cfop?:string,icmsCst?:string,icmsRate?:string,baseReduction?:string,mva?:string,fcp?:string,pisCst?:string,pisRate?:string,cofinsCst?:string,cofinsRate?:string,ipiCst?:string,ipiRate?:string,ibsCbsCst?:string,cClassTrib?:string,ibsStateRate?:string,ibsCityRate?:string,cbsRate?:string,isRate?:string,taxBenefit?:string,reformReduction?:string,reformNotes?:string}} LocalFiscalSettings
 * @typedef {LocalFiscalSettings & {name:string,code:string,category:ProductCategory,groupId?:string,description:string,priceCents:number,status:ProductStatus,unit:UnitOfMeasure,unitId?:string,margin?:string,promotionPriceCents?:number|null,promotionStart?:string,promotionEnd?:string}} CatalogBase
 * @typedef {CatalogBase & {type:'PRODUCT',gtin:string,ncm:string,ncmId?:string,brand:string,brandId?:string,manufacturerReference:string,costCents:number|null,trackStock:boolean,minimumStock:string,maximumStock?:string,initialStock?:string,stockStoreId?:string,stockLocation?:string,allowNegativeStock?:boolean}} Product
 * @typedef {CatalogBase & {type:'SERVICE',durationMinutes:string,serviceDescription:string}} Service
 * @typedef {Product|Service} CreateCatalogItemInput
 * @typedef {CreateCatalogItemInput} UpdateCatalogItemInput
 * @typedef {CreateCatalogItemInput & {id:string,createdAt:string,updatedAt:string}} CatalogItem
 * @typedef {{search?:string,searchField?:string,groupId?:string,groupName?:string,brandId?:string,brandName?:string,type?:CatalogItemType|'',status?:ProductStatus|'',category?:string,unit?:string,page:number,pageSize:number}} ProductListFilters
 * @typedef {{updatePrices:(changes:{productId:string,previousPriceCents:number,newPriceCents:number}[])=>Promise<CatalogItem[]>,list:(filters:ProductListFilters)=>Promise<{items:CatalogItem[],total:number,page:number,pageSize:number}>,getById:(id:string)=>Promise<CatalogItem|null>,create:(data:CreateCatalogItemInput)=>Promise<CatalogItem>,update:(id:string,data:UpdateCatalogItemInput)=>Promise<CatalogItem>,setActive:(id:string,active:boolean)=>Promise<CatalogItem>,summary:()=>Promise<{total:number,products:number,services:number,active:number}>}} ProductsRepository
 */
export {};
