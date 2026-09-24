import { Alert } from '@mui/material';
import { PageHeader } from '../components/common/PageHeader.jsx';

// Não há contrato de planos no backend oficial; não simular assinatura ou cobrança.
export function PlansPage() {
  return (
    <>
      <PageHeader title="Planos" description="A gestão de planos ainda não está disponível neste ambiente." />
      <Alert severity="info">Aguardando integração do módulo.</Alert>
    </>
  );
}
