import PropTypes from 'prop-types';
import { EntityModuleContext } from '../features/parties/entity-module.js';
import { EntityEditorPage } from '../features/parties/EntityEditorPage.jsx';
import { supplierModule } from '../features/suppliers/supplier-module.js';
// Formulário e perfil compartilhados preservam as seções específicas de dados comerciais.
export function SupplierEditorPage({ mode }) {
  return (
    <EntityModuleContext.Provider value={supplierModule}>
      <EntityEditorPage mode={mode} />
    </EntityModuleContext.Provider>
  );
}
SupplierEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
