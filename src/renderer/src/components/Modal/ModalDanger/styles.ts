import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

export const CustomDialog = styled(Dialog)(({ theme }) => ({
  'div.MuiDialog-paper': {
    borderRadius: '1rem',
    minWidth: '360px',
    maxWidth: '30rem',
    backgroundColor: theme.palette.background.paper,
    backgroundImage: 'none',
    [`@media (max-width: 480px)`]: {
      minWidth: 'calc(100vw - 2rem)',
      margin: '1rem',
    },
  },
  'div.MuiDialogContent-root': {
    padding: '1.5rem',
    [`@media (max-width: 600px)`]: {
      padding: '1rem',
    },
  },
  'div.MuiDialogActions-root': {
    padding: '1.5rem',
    [`@media (max-width: 600px)`]: {
      padding: '1rem',
    },
  },
}));

export const CustomDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '1.5rem 1.5rem 0 1.5rem',
  whiteSpace: 'nowrap',
  [`@media (max-width: 600px)`]: {
    padding: '1rem 1rem 0 1rem',
  },
  '& svg': {
    fontSize: '1.25rem',
    marginRight: '0.5rem',
    color: theme.palette.text.primary,
  },
}));

export const CustomDialogContent = styled(DialogContent)({});

export const CustomDialogActions = styled(DialogActions)({
  justifyContent: 'end',
  [`@media (max-width: 600px)`]: {
    justifyContent: 'space-between',
    flexWrap: 'wrap-reverse',
    gap: '1rem',
    '& button': {
      margin: '0 !important',
      minWidth: 'fit-content',
      flex: 1,
    },
  },
});

export const Title = styled(Typography)({
  whiteSpace: 'normal',
});
