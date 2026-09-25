import PropTypes from 'prop-types';
import { EntityEditorPage } from '../features/parties/EntityEditorPage.jsx';
// Criação, edição e perfil usam o mesmo editor, mantendo as rotas existentes de Clientes.
export function CustomerEditorPage({ mode }) {
  return <EntityEditorPage mode={mode} />;
}
CustomerEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
