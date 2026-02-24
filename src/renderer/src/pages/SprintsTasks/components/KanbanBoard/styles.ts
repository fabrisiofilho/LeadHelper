import { styled, Box, Paper } from '@mui/material';

export const KanbanContainer = styled(Box)(() => ({
  display: 'flex',
  gap: 16,
  height: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '0 4px 4px',
}));

export const KanbanColumn = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 280,
  maxWidth: 320,
  flex: '1 1 280px',
  height: '100%',
}));

export const ColumnHeader = styled(Box)<{ bordercolor: string }>(
  ({ theme, bordercolor }) => ({
    padding: theme.spacing(1.5, 2),
    borderTop: `3px solid ${bordercolor}`,
    borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  }),
);

export const ColumnContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(1),
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(0,0,0,0.02)',
  borderRadius: `0 0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px`,
  minHeight: 100,
}));

export const KanbanCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  cursor: 'grab',
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
  '&:active': {
    cursor: 'grabbing',
  },
  '&:last-child': {
    marginBottom: 0,
  },
}));

export const HeaderContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}));
