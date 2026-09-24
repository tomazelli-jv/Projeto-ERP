import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { lookupCep, normalizeCep } from '../api/cep.js';

// Consulta apenas em resposta à edição do campo, nunca ao montar um cadastro já preenchido.
export function useCepLookup(onAddress) {
  const client = useQueryClient();
  const current = useRef(null);
  const callback = useRef(onAddress);
  callback.current = onAddress;
  const [feedback, setFeedback] = useState('');
  useEffect(
    () => () => {
      clearTimeout(current.current?.timer);
      current.current?.controller.abort();
      current.current = null;
    },
    []
  );
  function change(value) {
    const cep = normalizeCep(value);
    if (current.current?.cep === cep) return;
    clearTimeout(current.current?.timer);
    current.current?.controller.abort();
    const request = { cep, controller: new AbortController() };
    current.current = request;
    setFeedback('');
    if (cep.length !== 8) return;
    setFeedback('Buscando CEP...');
    request.timer = setTimeout(async () => {
      try {
        // Cache compartilhado em memória por CEP; não persiste endereços em storage.
        const cached = client.getQueryState(['cep', cep]);
        const address =
          cached?.data && Date.now() - cached.dataUpdatedAt < 3600000
            ? cached.data
            : await lookupCep(cep, request.controller.signal);
        // Identidade da solicitação impede respostas antigas mesmo se transporte ignorar abort.
        if (current.current !== request) return;
        client.setQueryData(['cep', cep], address);
        callback.current(address);
        setFeedback('');
      } catch (error) {
        if (current.current !== request) return;
        setFeedback(
          error.message === 'CEP_NOT_FOUND'
            ? 'CEP não encontrado. Preencha o endereço manualmente.'
            : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.'
        );
      }
    }, 350);
  }
  return { change, feedback };
}
