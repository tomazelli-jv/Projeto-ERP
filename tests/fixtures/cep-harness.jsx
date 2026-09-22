import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessFormDialog } from '../../apps/web/src/components/business/BusinessFormDialog.jsx';
import { ThemeModeProvider } from '../../apps/web/src/app/ThemeModeProvider.jsx';
// Formulário real isolado: somente ViaCEP é substituído no teste; não há backend simulado.
const edit = new URLSearchParams(location.search).has('edit');
createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={new QueryClient()}>
    <ThemeModeProvider>
      <BusinessFormDialog
        kind="loja"
        company={{ id: 1, nome: 'Teste de CEP' }}
        record={
          edit ? { id: 1, cep: '01001000', rua: 'Endereço salvo', cidade: 'São Paulo', uf: 'SP' } : null
        }
        onClose={() => {}}
        onSubmit={() => {}}
      />
    </ThemeModeProvider>
  </QueryClientProvider>
);
