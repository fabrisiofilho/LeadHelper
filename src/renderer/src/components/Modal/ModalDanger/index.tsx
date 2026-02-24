import { ReactNode } from 'react';
import { Box, Button } from '@mui/material';

import {
  CustomDialog,
  CustomDialogTitle,
  CustomDialogContent,
  CustomDialogActions,
  Title,
} from './styles';
import { LoadingButton } from '../../LoadingButton';

export type ModalDangerProps = {
  variant: 'danger';

  title: string;
  open: boolean;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;

  icon?: ReactNode;
  loading?: boolean;
  noHeader?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  disabledCloseOnClickOutside?: boolean;

  handleClose: () => void;
  handleConfirm: () => void;
  handleCancel?: () => void;
};

export function ModalDanger({
  open,
  title,
  children,
  icon,
  confirmLabel,
  cancelLabel,
  loading,
  disabledCloseOnClickOutside,
  confirmDisabled,
  cancelDisabled,
  noHeader,
  handleClose,
  handleConfirm,
  handleCancel,
}: Readonly<ModalDangerProps>) {
  const onClose = (_: unknown, reason: string) => {
    if (!disabledCloseOnClickOutside) {
      handleClose();
    }

    if (reason !== 'backdropClick') {
      handleClose();
    }
  };

  const onCancel = () => {
    if (!handleCancel) {
      handleClose();
    } else {
      handleCancel();
    }
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      aria-labelledby={`${title}-dialog-title`}
    >
      {!noHeader && (
        <CustomDialogTitle id={`${title}-dialog-title`}>
          {icon}

          <Box>
            <Title textAlign="left" noWrap variant="h6">
              {title}
            </Title>
          </Box>
        </CustomDialogTitle>
      )}

      <CustomDialogContent>{children}</CustomDialogContent>
      <CustomDialogActions>
        <Button
          disabled={cancelDisabled || !!loading}
          variant="outlined"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>

        <LoadingButton
          loading={!!loading}
          disabled={confirmDisabled}
          variant="contained"
          onClick={handleConfirm}
        >
          {confirmLabel}
        </LoadingButton>
      </CustomDialogActions>
    </CustomDialog>
  );
}

ModalDanger.defaultProps = {
  loading: false,
  noHeader: false,
  confirmDisabled: false,
  cancelDisabled: false,
  disabledCloseOnClickOutside: false,
  icon: undefined,
  handleCancel: undefined,
  handleConfirm: undefined,
};
