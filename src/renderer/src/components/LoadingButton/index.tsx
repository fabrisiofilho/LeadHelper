import { Button, type ButtonProps, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { ChildrenContainer, Content, LoadingContainer } from './styles';

type LoadingButtonProps = Omit<ButtonProps, 'loading'> & {
  children: ReactNode;
  loading?: boolean;
};

export function LoadingButton({
  children,
  loading = false,
  ...rest
}: Readonly<LoadingButtonProps>) {
  return (
    <Button {...rest} disabled={loading || rest.disabled}>
      <Content>
        <LoadingContainer>
          {loading && <CircularProgress size={20} color="inherit" />}
        </LoadingContainer>

        <ChildrenContainer $hide={loading}>{children}</ChildrenContainer>
      </Content>
    </Button>
  );
}
