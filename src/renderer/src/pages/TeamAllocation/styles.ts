import { styled, Box } from '@mui/material';

export const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1600,
  margin: '0 auto',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

export const TopSelectorBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: Number(theme.shape.borderRadius) * 2,
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
}));

export const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderRadius: Number(theme.shape.borderRadius) * 2,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  minHeight: 0,
}));

export const PlaceholderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  textAlign: 'center',
  height: '100%',
}));

export const FormContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
  padding: theme.spacing(1),
}));
