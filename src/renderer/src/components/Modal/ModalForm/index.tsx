import { Box, Button, IconButton } from '@mui/material';
import { ReactNode } from 'react';
import { Show } from '@renderer/components/Show';
import { LoadingButton } from '../../LoadingButton';
import {
  CloseIcon,
  CustomDialog,
  CustomDialogActions,
  CustomDialogContent,
  CustomDialogTitle,
  Title,
} from './styles';

export type ModalFormProps = {
  variant: 'form';

  title: string | ReactNode;
  titleString?: string;
  open: boolean;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;

  loading?: boolean;
  hasCloseButton?: boolean;
  noFooter?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmFullWidth?: boolean;
  disabledCloseOnClickOutside?: boolean;

  setMaxWidth?: string;
  setMaxHeight?: string;
  width?: string;
  height?: string;
  disableFooterBorder?: boolean;
  disablePadding?: boolean;
  disableMargin?: boolean;
  hasAccess?: boolean;

  handleClose: () => void;
  handleConfirm?: () => void;
  handleCancel?: () => void;
};

export function ModalForm({
  open,
  title,
  titleString,
  children,
  confirmLabel,
  cancelLabel,
  loading,
  disabledCloseOnClickOutside,
  confirmDisabled,
  cancelDisabled,
  confirmFullWidth,
  noFooter,
  hasCloseButton,
  handleClose,
  handleConfirm,
  handleCancel,
  setMaxWidth,
  width,
  height,
  disableFooterBorder,
  disablePadding,
  disableMargin,
  setMaxHeight,
  hasAccess = true,
}: Readonly<ModalFormProps>) {
  const showCloseButton = noFooter || hasCloseButton;

  const titleId = typeof title === 'string' ? title : titleString;

  const onClose = (_: unknown, reason: string) => {
    if (loading) return;

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
      aria-labelledby={`${titleId}-dialog-form-title`}
      setMaxHeight={setMaxHeight}
      setMaxWidth={setMaxWidth}
      disableMargin={disableMargin}
      width={width}
      height={height}
    >
      <CustomDialogTitle id={`${titleId}-dialog-form-title`}>
        <Box>
          <Title textAlign="left" noWrap variant="h6">
            {title}
          </Title>
        </Box>

        {showCloseButton && (
          <IconButton onClick={() => onClose(null, '')} id="close-modal-button">
            <CloseIcon />
          </IconButton>
        )}
      </CustomDialogTitle>

      <CustomDialogContent disablePadding={disablePadding}>
        {children}
      </CustomDialogContent>

      {!noFooter && (
        <CustomDialogActions disableFooterBorder={disableFooterBorder}>
          <Show.When isTrue={!!cancelLabel}>
            <Button
              disabled={cancelDisabled || !!loading}
              variant="outlined"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          </Show.When>

          <Show.When isTrue={hasAccess}>
            <LoadingButton
              fullWidth={confirmFullWidth}
              loading={!!loading}
              disabled={confirmDisabled}
              variant="contained"
              onClick={handleConfirm}
            >
              {confirmLabel}
            </LoadingButton>
          </Show.When>
        </CustomDialogActions>
      )}
    </CustomDialog>
  );
}

ModalForm.defaultProps = {
  loading: false,
  noFooter: false,
  hasCloseButton: false,
  disabledCloseOnClickOutside: false,
  confirmLabel: 'Ok',
  cancelLabel: '',
  confirmDisabled: false,
  cancelDisabled: false,
  handleCancel: undefined,
  handleConfirm: undefined,
  setMaxWidth: undefined,
};
