import { Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Stack
        component="main"
        spacing={3}
        sx={{ minHeight: '100vh', justifyContent: 'center', textAlign: 'center' }}
      >
        <Typography component="h1" variant="h1">
          Página não encontrada
        </Typography>
        <Typography color="text.secondary">O endereço informado não existe ou foi removido.</Typography>
        <Button component={Link} to="/dashboard" variant="contained">
          Voltar ao dashboard
        </Button>
      </Stack>
    </Container>
  );
}
