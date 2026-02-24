import { useEffect, useRef } from 'react';
import { enqueueSnackbar } from 'notistack';
import { getToastConfig } from '@renderer/config/ipc-toast-messages';

const DEBOUNCE_TIME = 500; // ms para evitar toasts duplicados

interface LastToast {
  message: string;
  timestamp: number;
}

export function useIpcToastHandler(): void {
  const lastToastRef = useRef<LastToast | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onIpcResult((event) => {
      const config = getToastConfig(event.channel);

      // Ignora operações silenciosas (leitura de dados)
      if (config.silent) {
        return;
      }

      const now = Date.now();
      let message: string;
      let variant: 'success' | 'error';

      if (event.success) {
        // Só exibe toast de sucesso se houver mensagem configurada
        if (!config.success) {
          return;
        }
        message = config.success;
        variant = 'success';
      } else {
        // Para erros, usa a mensagem do backend se disponível, senão usa a configurada
        message = event.error || config.error || 'Erro na operação';
        variant = 'error';
      }

      // Evita toasts duplicados em sequência rápida
      const lastToast = lastToastRef.current;
      if (
        lastToast &&
        lastToast.message === message &&
        now - lastToast.timestamp < DEBOUNCE_TIME
      ) {
        return;
      }

      lastToastRef.current = { message, timestamp: now };

      enqueueSnackbar({
        variant,
        message,
        autoHideDuration: variant === 'success' ? 3000 : 5000,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
