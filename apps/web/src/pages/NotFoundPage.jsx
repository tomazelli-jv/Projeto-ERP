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
        <Typography component="h1" variant="h3">
          Página não encontrada
        </Typography>
        <Typography color="text.secondary">O endereço informado não existe.</Typography>
        <Button component={Link} to="/" variant="contained">
          Voltar ao início
        </Button>
      </Stack>
    </Container>
  );
}
