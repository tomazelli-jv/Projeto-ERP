import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Alert, Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';

export function FoundationPage() {
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: () => apiRequest('/health/live')
  });

  return (
    <Container maxWidth="md">
      <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
        <Paper elevation={2} sx={{ width: '100%', p: { xs: 3, md: 6 } }}>
          <Stack spacing={3}>
            <Chip label="Etapa 1.1" color="secondary" sx={{ alignSelf: 'flex-start' }} />
            <Typography component="h1" variant="h1">
              Tomazelli ERP
            </Typography>
            <Typography color="text.secondary" variant="h6">
              Fundação técnica executável do ERP SaaS da Tomazelli.dev.
            </Typography>
            {health.isPending && <Alert severity="info">Verificando a API…</Alert>}
            {health.isSuccess && (
              <Alert icon={<CheckCircleOutlineIcon />} severity="success">
                Frontend e API estão integrados.
              </Alert>
            )}
            {health.isError && (
              <Alert severity="warning">
                A interface está disponível, mas a API não respondeu. Inicie o ambiente completo com o comando
                de desenvolvimento.
              </Alert>
            )}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
