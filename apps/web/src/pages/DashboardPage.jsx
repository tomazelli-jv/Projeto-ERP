import { QuickAccessCard } from '../components/common/QuickAccessCard.jsx';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { useAuth } from '../app/auth/auth-context.js';
import { useOperationalContext } from '../app/operational-context/operational-context.js';
import { listLojas } from '../api/business.js';
import { businessScope, canManageBusiness, documentValue } from '../components/business/business-model.js';
import { formatPhone } from '../components/business/business-formatters.js';

const indicators = [
  ['Faturamento', BarChartOutlinedIcon],
  ['Vendas', PointOfSaleOutlinedIcon],
  ['Clientes ativos', GroupsOutlinedIcon],
  ['Produtos', Inventory2OutlinedIcon]
];
const shortcuts = [
  ['Vendas', 'Consultar operações', '/sales', PointOfSaleOutlinedIcon],
  ['Produtos', 'Consultar catálogo', '/products', Inventory2OutlinedIcon],
  ['Clientes', 'Consultar clientes', '/customers', GroupsOutlinedIcon],
  ['Financeiro', 'Consultar financeiro', '/financial', AccountBalanceWalletOutlinedIcon],
  ['Estoque', 'Consultar estoque', '/inventory', StorefrontOutlinedIcon],
  ['Configurações', 'Ajustes do sistema', '/settings', SettingsOutlinedIcon]
];

// Composição da referência com dados reais: sem séries, tendências ou eventos fabricados.
export function DashboardPage() {
  const { claims } = useAuth();
  const context = useOperationalContext();
  const admin = canManageBusiness(claims);
  const companyId = String(claims?.empresaId ?? '');
  const storesQuery = useQuery({
    queryKey: [...businessScope(claims), 'stores', companyId],
    queryFn: ({ signal }) => listLojas(signal),
    enabled: admin && Boolean(companyId) && !context.isSwitchingStore,
    retry: false
  });
  // Reutiliza a mesma chave de Empresas/Lojas; demais perfis veem somente seus vínculos oficiais.
  const stores = (admin ? (storesQuery.data ?? []) : context.stores).filter(
    (store) => String(store.empresaId) === companyId
  );
  const loading =
    context.isSwitchingStore || (admin && companyId ? storesQuery.isPending : context.isLoading);
  const error = admin ? storesQuery.error : context.error;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio e acesso às rotinas do sistema."
      />
      <Grid container spacing={2.5}>
        {indicators.map(([label, Icon]) => (
          <Grid key={label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 58,
                    height: 58,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 2,
                    color: 'primary.dark',
                    bgcolor: 'primary.soft'
                  }}
                >
                  <Icon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h2" sx={{ my: 0.75 }}>
                    —
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Aguardando integração
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="Vendas nos últimos 30 dias"
            icon={BarChartOutlinedIcon}
            sx={{ height: '100%', minHeight: 300 }}
          >
            <Box sx={{ minHeight: 220, display: 'grid', alignItems: 'center' }}>
              <EmptyState
                title="Faturamento ainda não disponível"
                description="O gráfico será exibido quando os dados de vendas estiverem integrados."
              />
            </Box>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Acesso rápido" icon={BoltOutlinedIcon} sx={{ height: '100%' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))' },
                gap: 1
              }}
            >
              {shortcuts.map(([label, description, path, Icon]) => (
                <QuickAccessCard key={path} icon={Icon} title={label} description={description} to={path} />
              ))}
            </Box>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard sx={{ height: '100%', minWidth: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <StorefrontOutlinedIcon sx={{ color: 'primary.dark' }} />
                <Typography component="h2" variant="h3">
                  {admin ? 'Lojas da empresa' : 'Lojas disponíveis'}
                </Typography>
              </Stack>
              {admin && (
                <Button
                  component={Link}
                  to="/admin/companies"
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 99 }}
                >
                  Ver todas
                </Button>
              )}
            </Stack>
            {loading ? (
              <Skeleton variant="rounded" height={180} />
            ) : error ? (
              <Alert severity="error">
                Não foi possível consultar as lojas.{' '}
                <Button onClick={() => (admin ? storesQuery.refetch() : context.retry())}>
                  Tentar novamente
                </Button>
              </Alert>
            ) : !stores.length ? (
              <EmptyState
                title="Nenhuma loja disponível"
                description="As lojas aparecerão conforme o contexto da sua sessão."
              />
            ) : (
              <TableContainer>
                <Table
                  size="small"
                  aria-label="Lojas no dashboard"
                  sx={{
                    minWidth: admin ? 620 : 300,
                    '& th': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: 11,
                      fontWeight: 750,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    },
                    '& td': { fontSize: 12, py: 1.5 },
                    '& tr:last-child td': { borderBottom: 0 }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      {admin && (
                        <>
                          <TableCell>CNPJ / CPF</TableCell>
                          <TableCell>E-mail</TableCell>
                          <TableCell>Telefone</TableCell>
                        </>
                      )}
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id} hover>
                        <TableCell sx={{ fontWeight: 650 }}>{store.nome}</TableCell>
                        {admin && (
                          <>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{documentValue(store)}</TableCell>
                            <TableCell sx={{ overflowWrap: 'anywhere' }}>
                              {store.email || 'Não informado'}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {formatPhone(store.telefone) || 'Não informado'}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Chip
                            size="small"
                            label={store.ativo ? 'Ativa' : 'Inativa'}
                            color={store.ativo ? 'success' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Atividades recentes" icon={HistoryOutlinedIcon} sx={{ height: '100%' }}>
            <EmptyState
              title="Histórico ainda não disponível"
              description="As atividades serão exibidas quando houver uma fonte de dados integrada."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
