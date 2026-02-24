import Close from '@mui/icons-material/Close';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

type CustomDialogProps = {
  setMaxWidth?: string;
  setMaxHeight?: string;
  disableMargin?: boolean;
  width?: string;
  height?: string;
  backgroundColor?: string;
};

type CustomDialogActionsProps = {
  disableFooterBorder?: boolean;
};

type CustomDialogContentProps = {
  disablePadding?: boolean;
};

export const CustomDialog = styled(Dialog, {
  shouldForwardProp: (prop) =>
    ![
      'setMaxWidth',
      'setMaxHeight',
      'disableMargin',
      'width',
      'height',
      'backgroundColor',
    ].includes(prop as string),
})<CustomDialogProps>(
  ({
    theme,
    setMaxWidth,
    setMaxHeight,
    disableMargin,
    width,
    height,
    backgroundColor,
  }) => ({
    '& .MuiDialog-paper': {
      borderRadius: '1rem',
      minWidth: '400px',
      maxWidth: setMaxWidth ?? '60rem',
      margin: disableMargin ? '0' : '2rem',
      backgroundColor: backgroundColor || theme.palette.background.paper,
      backgroundImage: 'none',
      ...(width && { width }),
      ...(height && {
        height,
        display: 'flex',
        flexDirection: 'column' as const,
      }),
      ...(setMaxHeight && { maxHeight: setMaxHeight }),
      [`@media (max-width: 480px)`]: {
        minWidth: 'calc(100vw - 2rem)',
        margin: '1rem',
      },
    },
    'div.MuiDialogContent-root': {
      padding: '1.5rem',
      ...(height && { flex: 1, minHeight: 0, overflow: 'hidden' }),
    },
    'div.MuiDialogActions-root': {
      padding: '1.5rem',
    },
  }),
);

export const CustomDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1.5rem',
  whiteSpace: 'nowrap',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const CustomDialogContent = styled(DialogContent, {
  shouldForwardProp: (props) => props !== 'disablePadding',
})<CustomDialogContentProps>(({ disablePadding }) => ({
  ...(disablePadding && { padding: '0 !important' }),
  display: 'flex',
  flexDirection: 'column',
}));

export const CustomDialogActions = styled(DialogActions, {
  shouldForwardProp: (props) => props !== 'disableFooterBorder',
})<CustomDialogActionsProps>(({ theme, disableFooterBorder }) => ({
  justifyContent: 'end',
  ...(!disableFooterBorder && {
    borderTop: `1px solid ${theme.palette.divider}`,
  }),
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
}));

export const Title = styled(Typography)({
  whiteSpace: 'normal',
});

export const CloseIcon = styled(Close)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
