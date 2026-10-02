import { LookupDialog } from '../catalog-lookups/LookupDialog.jsx';
import { groupModule } from './group-module.js';
// Cadastro reutilizavel sobre qualquer tela, com o mesmo fluxo de Marcas.
export function GroupsDialog(props) {
  return <LookupDialog {...props} module={groupModule} />;
}
