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

const indicators = [
  {
    label: 'Vendas do dia',
    value: '—',
    detail: 'Aguardando integração do módulo',
    icon: PointOfSaleOutlinedIcon
  },
  {
    label: 'Contas a receber',
    value: '—',
    detail: 'Aguardando integração do módulo',
    icon: ReceiptLongOutlinedIcon
  },
  {
    label: 'Contas a pagar',
    value: '—',
    detail: 'Aguardando integração do módulo',
    icon: AccountBalanceWalletOutlinedIcon
  },
  {
    label: 'Estoque baixo',
    value: '—',
    detail: 'Aguardando integração do módulo',
    icon: Inventory2OutlinedIcon
  }
];

const shortcuts = [
  { label: 'Consultar clientes', path: '/customers' },
  { label: 'Consultar produtos', path: '/products' },
  { label: 'Abrir vendas', path: '/sales' }
];

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Uma visão geral dos módulos e das rotinas disponíveis no seu ambiente."
        action={<Chip label="Módulos aguardando integração" variant="outlined" />}
      />
      <Grid container spacing={2.5}>
        {indicators.map(({ label, value, detail, icon: Icon }) => (
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
                      borderRadius: 2.5,
                      color: 'primary.main',
                      backgroundColor: 'primary.light'
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
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="Atividades recentes"
            subtitle="Atualizações reais aparecerão aqui quando os módulos forem conectados."
            sx={{ height: '100%' }}
          >
            <EmptyState
              title="Atividades ainda não disponíveis"
              description="Nenhuma informação operacional será exibida sem uma fonte de dados real."
            />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
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
      </Grid>
    </>
  );
}
