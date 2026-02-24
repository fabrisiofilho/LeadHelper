import { ReactNode } from 'react';
import { Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { Modal } from '../components/Modal';
import {
  openConfirmModal,
  closeConfirmModal,
} from '../redux/slices/confirmModal';
import { useAppDispatch, useAppSelector } from './redux';

type Options = {
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  rejectAction?: () => void;
  action: () => void;
};

type ConfirmModalActions = {
  openConfirmModal: (data: Options) => void;
};

type Props = {
  children: ReactNode;
};

const DEFAULT_OPTIONS: Options = {
  title: 'Confirmar',
  description: 'Tem certeza que deseja realizar essa ação?',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  action: () => {},
  rejectAction: () => {},
};

export function ConfirmModalProvider({ children }: Readonly<Props>) {
  const dispatch = useAppDispatch();

  const {
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    action,
    rejectAction,
  } = useAppSelector((state) => state.confirmModal);

  const handleClose = () => {
    dispatch(closeConfirmModal());
  };

  const handleCancel = () => {
    rejectAction();
    handleClose();
  };

  const handleConfirm = () => {
    action();
    handleClose();
  };

  return (
    <>
      {children}
      <Modal
        variant="danger"
        open={open}
        title={title}
        handleClose={handleCancel}
        handleCancel={handleCancel}
        handleConfirm={handleConfirm}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
      >
        <Typography variant="body2">{description}</Typography>
      </Modal>
    </>
  );
}

export function useConfirmModal(): ConfirmModalActions {
  const dispatch = useDispatch();

  return {
    openConfirmModal: (data) => {
      dispatch(openConfirmModal({ ...DEFAULT_OPTIONS, ...data }));
    },
  };
}
