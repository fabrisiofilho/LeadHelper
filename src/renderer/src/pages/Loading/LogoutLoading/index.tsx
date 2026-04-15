import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Container, MessageContainer } from './styles';
import leadhelperLogo from '@renderer/assets/leadhelper_logo.png';
const LOGOUT_MESSAGES = [
  'Finalizando sessão...',
  'Desconectando das controladoras...',
  'Salvando dados pendentes...',
  'Limpando cache local...',
  'Encerrando processos...',
  'Quase lá...',
];
const MESSAGE_INTERVAL = 2000;

export function LogoutLoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOGOUT_MESSAGES.length);
    }, MESSAGE_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return (
    <Container>
      <Stack alignItems="center" gap={4}>
        <img
          src={leadhelperLogo}
          alt="LeadHelper Logo"
          style={{ height: '3rem' }}
        />
        <Box position="relative" display="inline-flex">
          <CircularProgress size={60} thickness={4} />
        </Box>
        <MessageContainer>
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            sx={{
              animation: 'fadeIn 0.3s ease-in-out',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 },
              },
            }}
          >
            {LOGOUT_MESSAGES[messageIndex]}
          </Typography>
        </MessageContainer>
      </Stack>
    </Container>
  );
}
