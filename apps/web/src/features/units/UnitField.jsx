import { LookupCodeField } from '../catalog-lookups/LookupCodeField.jsx';
import { unitModule } from './unit-module.js';
import PropTypes from 'prop-types';
// Preserva o contrato de unidades e compartilha a selecao de codigos.
export function UnitField({ value, unitId, initialUnit, initialId, required, onChange }) {
  return (
    <LookupCodeField
      module={unitModule}
      codeKey="abbreviation"
      label={required ? 'Unidade de medida' : 'Unidade de cobrança'}
      value={value}
      recordId={unitId}
      initialValue={initialUnit}
      initialId={initialId}
      required={required}
      onChange={({ code, id }) => onChange({ unit: code, unitId: id })}
    />
  );
}
UnitField.propTypes = {
  value: PropTypes.string.isRequired,
  unitId: PropTypes.string,
  initialUnit: PropTypes.string,
  initialId: PropTypes.string,
  required: PropTypes.bool,
  onChange: PropTypes.func.isRequired
};
