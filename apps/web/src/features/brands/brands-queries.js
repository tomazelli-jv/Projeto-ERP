import { useLookupSource, useLookupList, useLookupMutation } from '../catalog-lookups/lookup-queries.js';
import { brandModule } from './brand-module.js';
// Compatibilidade para os consumidores existentes, com o mesmo cache e storage.
export const useBrandsSource = () => useLookupSource(brandModule);
export const useBrands = (filters = {}) => useLookupList(brandModule, filters);
export const useBrandMutation = () => useLookupMutation(brandModule);
