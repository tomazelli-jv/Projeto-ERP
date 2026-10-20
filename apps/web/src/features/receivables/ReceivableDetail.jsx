import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { customerName } from '../customers/customer-model.js';
import { dialogStyles } from './receivables-styles.js';
import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { formatReceivableDate as formatDate } from './receivables-model.js';
import { formatReceivableMoney as formatMoney } from './receivables-model.js';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { usePaymentMethods } from './receivables-queries.js';
import { ReceivableStatus } from './ReceivableShared.jsx';

// Seções selecionáveis seguem o perfil de Clientes; a trilha exibe somente eventos persistidos.
const iconBox = {
  display: 'grid',
  placeItems: 'center',
  width: 52,
  height: 52,
  flexShrink: 0,
  borderRadius: 1.5,
  bgcolor: 'success.soft',
  color: 'success.main',
  border: '1px solid',
  borderColor: 'divider'
};
const surface = { border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' };
export function ReceivableDetail({ title, onClose }) {
  const [section, setSection] = useState('Dados do título');
  const methods = usePaymentMethods();
  return (
    <Dialog
      sx={dialogStyles}
      open
      fullWidth
      maxWidth="xl"
      onClose={onClose}
      aria-labelledby="receivable-detail-title"
    >
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box sx={iconBox}>
          <DescriptionOutlinedIcon fontSize="large" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            id="receivable-detail-title"
            component="h2"
            variant="h1"
            sx={{ fontSize: { xs: 24, md: 30 } }}
          >
            Título a receber
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Visualização dos dados do título do contas a receber.
          </Typography>
        </Box>
        <Tooltip title="Fechar">
          <IconButton
            aria-label="Fechar visualização do título"
            onClick={onClose}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ ...surface, p: { xs: 2, md: 3 }, mb: 2.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' },
              gap: 3
            }}
          >
            {[
              [
                'Cliente',
                title.customer ? customerName(title.customer) : 'Cliente indisponível',
                PersonOutlineIcon
              ],
              ['Documento', title.document || '—', DescriptionOutlinedIcon],
              ['Parcela', title.installmentNumber + '/' + title.installmentCount, PieChartOutlineIcon],
              ['Vencimento', formatDate(title.dueDate), CalendarTodayOutlinedIcon],
              ['Valor original', formatMoney(title.originalAmountCents), PaymentsOutlinedIcon],
              ['Saldo atual', formatMoney(title.balanceCents), CreditCardOutlinedIcon]
            ].map(([label, value, Icon], index) => (
              <Stack
                key={label}
                direction="row"
                alignItems="center"
                spacing={2.5}
                sx={{
                  minWidth: 0,
                  borderRight: { xs: 0, sm: index % 3 === 2 ? 0 : '1px solid' },
                  borderColor: 'divider',
                  pr: 2
                }}
              >
                <Box sx={iconBox}>
                  <Icon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography
                    fontWeight={600}
                    sx={{
                      mt: 0.5,
                      fontSize: { xs: 16, md: 19 },
                      overflowWrap: 'anywhere',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Box>
          <Box
            sx={{
              mt: 2,
              width: { xs: '100%', sm: '32%' },
              '& .MuiChip-root': { width: '100%', height: 36, justifyContent: 'flex-start', px: 1 }
            }}
          >
            <ReceivableStatus status={title.status} />
          </Box>
        </Box>
        <Box
          role="group"
          aria-label="Seções do título"
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5, mb: 2.5 }}
        >
          {['Dados do título', 'Recebimentos', 'Histórico'].map((label, index) => (
            <Button
              key={label}
              aria-pressed={section === label}
              variant="outlined"
              startIcon={
                index === 0 ? (
                  <DescriptionOutlinedIcon />
                ) : index === 1 ? (
                  <PaymentsOutlinedIcon />
                ) : (
                  <HistoryIcon />
                )
              }
              sx={{
                minHeight: 64,
                justifyContent: 'flex-start',
                px: 3,
                gap: 2,
                fontSize: 16,
                borderRadius: 1.5,
                color: section === label ? 'success.main' : 'text.primary',
                borderColor: section === label ? 'success.main' : 'divider',
                bgcolor: section === label ? 'success.soft' : 'background.paper'
              }}
              onClick={() => setSection(label)}
            >
              {label}
            </Button>
          ))}
        </Box>
        {section === 'Dados do título' && (
          <Box sx={surface}>
            <Stack
              direction="row"
              alignItems="center"
              gap={2}
              sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Box sx={iconBox}>
                <DescriptionOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h3">Dados do título</Typography>
                <Typography variant="body2" color="text.secondary">
                  Informações detalhadas do título a receber.
                </Typography>
              </Box>
            </Stack>
            <Box component="dl" sx={{ m: 0, px: 3, py: 2 }}>
              {Object.entries({
                Descrição: title.description,
                Origem: title.origin === 'MANUAL' ? 'Manual' : title.origin,
                'Data de emissão': formatDate(title.issueDate),
                Observação: title.notes || '—'
              }).map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px,25%) 1fr' },
                    gap: 1,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 }
                  }}
                >
                  <Typography component="dt" variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {section === 'Recebimentos' &&
          (title.payments.length ? (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 850 }} aria-label="Recebimentos do título">
                <TableHead>
                  <TableRow>
                    {[
                      'Data',
                      'Forma de pagamento',
                      'Valor da baixa',
                      'Desconto',
                      'Juros',
                      'Multa',
                      'Total recebido'
                    ].map((label) => (
                      <TableCell key={label}>{label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {title.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.receivedAt)}</TableCell>
                      <TableCell>
                        {methods.data?.find((m) => m.id === p.paymentMethodId)?.name ?? '—'}
                      </TableCell>
                      {[
                        'amountAppliedCents',
                        'discountCents',
                        'interestCents',
                        'penaltyCents',
                        'totalReceivedCents'
                      ].map((key) => (
                        <TableCell key={key}>{formatMoney(p[key])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <EmptyState
              title="Nenhum recebimento registrado."
              description="As baixas confirmadas aparecerão nesta seção."
            />
          ))}
        {section === 'Histórico' &&
          (title.history.length ? (
            <Stack spacing={2}>
              {title.history.map((h) => (
                <Box key={h.id} sx={{ borderLeft: 2, borderColor: 'primary.main', pl: 2 }}>
                  <Typography variant="body2">{h.action}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(h.createdAt).toLocaleString('pt-BR')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <EmptyState
              title="Nenhum histórico detalhado disponível."
              description="Somente ações realizadas neste módulo serão registradas."
            />
          ))}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" sx={{ minWidth: 110 }} onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
ReceivableDetail.propTypes = { title: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired };
