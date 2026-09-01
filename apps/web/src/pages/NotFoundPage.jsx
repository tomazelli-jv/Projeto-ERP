import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Stack
        component="main"
        spacing={3}
        sx={{ minHeight: '100vh', justifyContent: 'center', textAlign: 'center', py: 4 }}
      >
        <Box aria-hidden sx={{ color: 'primary.main', fontSize: 64, fontWeight: 800, lineHeight: 1 }}>
          404
        </Box>
        <Typography component="h1" variant="h1">
          Página não encontrada
        </Typography>
        <Typography color="text.secondary">
          O endereço informado não existe ou não está disponível.
        </Typography>
        <Button component={Link} sx={{ alignSelf: 'center' }} to="/dashboard" variant="contained">
          Ir para o Dashboard
        </Button>
      </Stack>
    </Container>
  );
}
