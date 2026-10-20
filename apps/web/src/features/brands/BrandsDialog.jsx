import { LookupDialog } from '../catalog-lookups/LookupDialog.jsx';
import { brandModule } from './brand-module.js';
// Entrada existente preservada para navbar e futuros cadastros rapidos.
export function BrandsDialog(props) {
  return <LookupDialog {...props} module={brandModule} />;
}
