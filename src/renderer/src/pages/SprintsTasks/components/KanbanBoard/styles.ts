import { styled, Box, Paper, keyframes } from '@mui/material';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
  50% { box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.12); }
`;

export const KanbanContainer = styled(Box)(() => ({
  display: 'flex',
  gap: 12,
  flex: 1,
  minHeight: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '4px 4px 8px',
  scrollBehavior: 'smooth',
  '&::-webkit-scrollbar': {
    height: 6,
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
}));

export const KanbanColumn = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 270,
  maxWidth: 320,
  flex: '1 1 270px',
  minHeight: 0,
  height: '100%',
  animation: `${fadeIn} 0.3s ease-out`,
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
    flexShrink: 0,
  }),
);

export const ColumnContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragOver',
})<{ isDragOver?: boolean }>(({ theme, isDragOver }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing(1),
  backgroundColor: isDragOver
    ? theme.palette.mode === 'dark'
      ? 'rgba(25, 118, 210, 0.08)'
      : 'rgba(25, 118, 210, 0.06)'
    : theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(0,0,0,0.02)',
  borderRadius: `0 0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px`,
  transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  border: isDragOver
    ? `1px dashed ${theme.palette.primary.main}40`
    : '1px dashed transparent',
  '&::-webkit-scrollbar': {
    width: 4,
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
}));

export const KanbanCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragging',
})<{ isDragging?: boolean }>(({ theme, isDragging }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  cursor: 'grab',
  width: '100%',
  boxSizing: 'border-box',
  transition: isDragging
    ? 'none'
    : 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
  transform: isDragging ? 'rotate(1.5deg) scale(1.02)' : 'none',
  boxShadow: isDragging ? theme.shadows[8] : theme.shadows[1],
  opacity: isDragging ? 0.95 : 1,
  animation: isDragging ? `${pulseGlow} 1.5s ease-in-out infinite` : 'none',
  '&:hover': {
    boxShadow: isDragging ? undefined : theme.shadows[4],
    transform: isDragging ? undefined : 'translateY(-1px)',
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
  flexShrink: 0,
}));
