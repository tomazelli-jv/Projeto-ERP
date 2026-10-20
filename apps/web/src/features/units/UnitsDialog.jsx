import { LookupDialog } from '../catalog-lookups/LookupDialog.jsx';
import { unitModule } from './unit-module.js';
// Uma única entrada reutilizável na navegação e no formulário de Produto.
export function UnitsDialog(props) {
  return <LookupDialog {...props} module={unitModule} />;
}
