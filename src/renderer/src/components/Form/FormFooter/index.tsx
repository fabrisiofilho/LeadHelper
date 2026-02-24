import { useResponsiveCurrentSize } from '@renderer/hooks/responsiveCurrentSize';
import { muiResponsiveValues } from '@renderer/utils/responsive';
import { type ButtonProps, Stack } from '@mui/material';
import { type ReactNode } from 'react';
import { LoadingButton } from '../../LoadingButton';
import { Show } from '../../Show';
import { ButtonContainer } from './styles';

type Props = {
  mt?: string;
  confirmType?: 'reset' | 'button' | 'submit';
  confirmLabel?: string;
  confirmAction?: () => void;
  confirmDisabled?: boolean;
  confirmProps?: ButtonProps;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  cancelLoading?: boolean;
  cancelProps?: ButtonProps;
  cancelAction?: () => void;
  loading?: boolean;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  form?: string;
  size?: 'small' | 'medium' | 'large';
};

export function FormFooter({
  confirmAction,
  cancelAction,
  confirmDisabled,
  cancelDisabled,
  cancelLoading,
  confirmProps,
  cancelProps,
  rightContent,
  loading,
  leftContent,
  form,
  size,
  mt,
  confirmType = 'submit',
  confirmLabel = 'Salvar',
  cancelLabel = 'Descartar',
}: Readonly<Props>) {
  const isMobile = useResponsiveCurrentSize() === 'xs';

  return (
    <Stack
      mt={mt}
      direction={muiResponsiveValues('column', 'column', 'row')}
      justifyContent="space-between"
      gap={2}
    >
      <ButtonContainer>{leftContent}</ButtonContainer>

      <ButtonContainer>
        <Stack
          direction={muiResponsiveValues(
            'column-reverse',
            'column-reverse',
            'row',
          )}
          justifyContent="space-between"
          gap="0.625rem"
        >
          {rightContent}

          <Show.When isTrue={!!cancelAction}>
            <LoadingButton
              variant="outlined"
              onClick={cancelAction}
              size={size}
              disabled={!!loading || cancelDisabled}
              fullWidth={isMobile}
              {...cancelProps}
              loading={cancelLoading === true}
            >
              {cancelLabel}
            </LoadingButton>
          </Show.When>

          <LoadingButton
            variant="contained"
            type={confirmType}
            onClick={confirmAction}
            form={form}
            size={size}
            disabled={confirmDisabled || cancelLoading}
            fullWidth={isMobile}
            {...confirmProps}
            loading={loading === true}
          >
            {confirmLabel}
          </LoadingButton>
        </Stack>
      </ButtonContainer>
    </Stack>
  );
}
