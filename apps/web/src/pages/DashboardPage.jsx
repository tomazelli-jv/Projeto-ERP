import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { useAuth } from '../app/auth/auth-context.js';

const indicators = [
  {
    label: 'Vendas do dia',
    value: '—',
    detail: 'Aguardando integração do módulo',
    tone: 'info',
    icon: PointOfSaleOutlinedIcon
  },
  {
    label: 'Contas a receber',
    value: '—',
    detail: 'Aguardando integração do módulo',
    tone: 'success',
    icon: ReceiptLongOutlinedIcon
  },
  {
    label: 'Contas a pagar',
    value: '—',
    detail: 'Aguardando integração do módulo',
    tone: 'error',
    icon: AccountBalanceWalletOutlinedIcon
  },
  {
    label: 'Estoque baixo',
    value: '—',
    detail: 'Aguardando integração do módulo',
    tone: 'warning',
    icon: Inventory2OutlinedIcon
  }
];

const shortcuts = [
  { label: 'Consultar clientes', path: '/customers' },
  { label: 'Consultar produtos', path: '/products' },
  { label: 'Abrir vendas', path: '/sales' }
];

export function DashboardPage() {
  // Saudação usa o contexto real; indicadores continuam indisponíveis sem API, nunca zero fictício.
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title={user?.name ? `Olá, ${user.name}` : 'Dashboard'}
        description="Uma visão geral dos módulos e das rotinas disponíveis no seu ambiente."
        action={<Chip label="Módulos aguardando integração" variant="outlined" />}
      />
      <Grid container spacing={2.5}>
        {indicators.map(({ label, value, detail, tone, icon: Icon }) => (
          <Grid key={label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {label}
                    </Typography>
                    <Typography aria-label="Dado ainda não disponível" sx={{ mt: 1 }} variant="h2">
                      {value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 42,
                      height: 42,
                      borderRadius: 1,
                      color: `${tone}.main`,
                      backgroundColor: `${tone}.soft`
                    }}
                  >
                    <Icon />
                  </Box>
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 2 }} variant="caption">
                  {detail}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Faturamento" subtitle="Últimos 7 dias" sx={{ height: '100%' }}>
            <EmptyState
              title="Sem dados disponíveis"
              description="Dados disponíveis após integração do módulo de vendas."
            />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="Atalhos rápidos"
            subtitle="Acesse as áreas principais do ERP."
            sx={{ height: '100%' }}
          >
            <Stack spacing={1}>
              {shortcuts.map(({ label, path }) => (
                <Button
                  component={Link}
                  endIcon={<ArrowForwardIcon />}
                  fullWidth
                  key={path}
                  sx={{ justifyContent: 'space-between', py: 1.25 }}
                  to={path}
                  variant="outlined"
                >
                  {label}
                </Button>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={12}>
          <SectionCard title="Atividades recentes">
            <Typography color="text.secondary" variant="body2">
              As atividades aparecerão quando os módulos estiverem conectados.
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
