import { ButtonBase, styled } from '@mui/material';

export const ListItemContainer = styled(ButtonBase)(({ theme }) => ({
  margin: '0 1.2rem',
  padding: '0.8rem 0',
  justifyContent: 'space-between',
  '& + &': {
    borderTop: `solid 0.063rem ${theme.palette.divider}`,
  },
}));
