import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import PropTypes from 'prop-types';
import { formatPhone } from './business-formatters.js';
import { documentValue } from './business-model.js';

// Tabela compacta: scroll fica no contêiner em telas pequenas, sem alargar a página.
// Status usa PUT com confirmação; não oferece exclusão física como atalho de inativação.
export function LojasTable({ lojas, disabled, onView, onEdit, onStatus }) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      tabIndex={0}
      aria-label="Lista de lojas"
      sx={{ borderRadius: 1.5, overflowX: 'auto' }}
    >
      <Table
        size="small"
        aria-label="Lojas da empresa"
        sx={{
          minWidth: 720,
          '& th': {
            bgcolor: 'surface.secondary',
            color: 'text.secondary',
            fontSize: 11,
            fontWeight: 700,
            py: 1.5,
            whiteSpace: 'nowrap'
          },
          '& td': { fontSize: 12, py: 1 },
          '& tr:last-child td': { borderBottom: 0 }
        }}
      >
        <TableHead>
          <TableRow>
            {['NOME', 'CNPJ / CPF', 'E-MAIL', 'TELEFONE', 'STATUS', 'AÇÕES'].map((label) => (
              <TableCell key={label}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {lojas.map((loja) => (
            <TableRow key={loja.id} hover>
              <TableCell sx={{ fontWeight: 600, maxWidth: 240, overflowWrap: 'anywhere' }}>
                {loja.nome}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{documentValue(loja)}</TableCell>
              <TableCell sx={{ maxWidth: 260, overflowWrap: 'anywhere' }}>
                {loja.email || 'Não informado'}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatPhone(loja.telefone) || 'Não informado'}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={loja.ativo ? 'Ativa' : 'Inativa'}
                  color={loja.ativo ? 'success' : 'error'}
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.75}>
                  <Tooltip title="Visualizar loja">
                    <IconButton
                      size="small"
                      aria-label="Visualizar dados da loja"
                      onClick={() => onView(loja)}
                    >
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar loja">
                    <IconButton
                      size="small"
                      aria-label="Editar loja"
                      disabled={disabled}
                      onClick={() => onEdit(loja)}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={loja.ativo ? 'Inativar' : 'Ativar'}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={loja.ativo ? 'Inativar' : 'Ativar'}
                        disabled={disabled}
                        onClick={() => onStatus(loja)}
                        color={loja.ativo ? 'default' : 'success'}
                      >
                        {loja.ativo ? (
                          <BlockOutlinedIcon fontSize="small" />
                        ) : (
                          <CheckCircleOutlineIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
LojasTable.propTypes = {
  lojas: PropTypes.array.isRequired,
  disabled: PropTypes.bool,
  onView: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onStatus: PropTypes.func.isRequired
};
