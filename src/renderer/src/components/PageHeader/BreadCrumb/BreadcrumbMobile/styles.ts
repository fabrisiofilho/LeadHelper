import CircleIcon from '@mui/icons-material/Circle';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { IconButton, Menu, styled } from '@mui/material';

export const SeparatorIcon = styled(CircleIcon)(({ theme }) => ({
  fontSize: '0.25rem',
  color: theme.palette.text.secondary,
}));

export const MoreIcon = styled(MoreHorizIcon)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.primary.main,
  transform: 'translateY(0.2rem)',
}));

export const BreadcrumbButton = styled(IconButton)({
  padding: 0,
  marginRight: '0.5rem',
});

export const CustomMenu = styled(Menu)({
  '& .MuiMenuItem-root': {
    paddingLeft: '0.5rem',
    paddingRight: '0.5rem',
  },
});
