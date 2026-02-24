import { createSlice } from '@reduxjs/toolkit';

type ConfirmModal = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  action: () => void;
  rejectAction: () => void;
};

const initialState: ConfirmModal = {
  open: false,
  title: '',
  description: '',
  confirmLabel: '',
  cancelLabel: '',
  action: () => {},
  rejectAction: () => {},
};

export const confirmModalSlice = createSlice({
  name: 'confirmModal',
  initialState,
  reducers: {
    openConfirmModal(state, { payload }) {
      return { ...state, ...payload, open: true };
    },
    closeConfirmModal(state) {
      return { ...state, open: false };
    },
  },
});

export const { openConfirmModal, closeConfirmModal } =
  confirmModalSlice.actions;
