import { EntityModuleContext } from '../features/parties/entity-module.js';
import { EntityListPage } from '../features/parties/EntityListPage.jsx';
import { supplierModule } from '../features/suppliers/supplier-module.js';
// A mesma listagem de Clientes recebe fonte e vocabulário independentes de Fornecedores.
export function SuppliersPage() {
  return (
    <EntityModuleContext.Provider value={supplierModule}>
      <EntityListPage />
    </EntityModuleContext.Provider>
  );
}
