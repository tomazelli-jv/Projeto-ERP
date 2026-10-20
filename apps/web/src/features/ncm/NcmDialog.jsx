import { LookupDialog } from '../catalog-lookups/LookupDialog.jsx';
import { ncmModule } from './ncm-module.js';
// Mesmo cadastro na navegação e no Produto, sem rota adicional.
export function NcmDialog(props) {
  return <LookupDialog {...props} module={ncmModule} />;
}
