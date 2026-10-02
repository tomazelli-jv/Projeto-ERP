import { LookupCodeField } from '../catalog-lookups/LookupCodeField.jsx';
import { ncmModule } from './ncm-module.js';
import PropTypes from 'prop-types';
// Referencias historicas e cadastro rapido utilizam o mesmo fluxo dos demais auxiliares.
export function NcmField({ value, ncmId, initialNcm, initialId, onChange }) {
  return (
    <LookupCodeField
      module={ncmModule}
      codeKey="code"
      label="NCM"
      value={value}
      recordId={ncmId}
      initialValue={initialNcm}
      initialId={initialId}
      onChange={({ code, id }) => onChange({ ncm: code, ncmId: id })}
    />
  );
}
NcmField.propTypes = {
  value: PropTypes.string.isRequired,
  ncmId: PropTypes.string,
  initialNcm: PropTypes.string,
  initialId: PropTypes.string,
  onChange: PropTypes.func.isRequired
};
