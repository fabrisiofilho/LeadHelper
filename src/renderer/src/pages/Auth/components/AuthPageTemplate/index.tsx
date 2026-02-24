import { ReactNode } from 'react';
import { Stack } from '@mui/material';
import { Container } from './styles';

type Props = {
  children: ReactNode;
};

export function AuthPageTemplate({ children }: Props) {
  return (
    <Container>
      <Stack
        px="2rem"
        width="100%"
        maxWidth="28rem"
        maxHeight="100vh"
        overflow="auto"
        alignItems="center"
        justifyContent="center"
      >
        <Stack alignItems="center" alignSelf="stretch">
          {children}
        </Stack>
      </Stack>
    </Container>
  );
}
