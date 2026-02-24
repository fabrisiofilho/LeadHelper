import CircleIcon from '@mui/icons-material/Circle';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { Breadcrumbs, styled as muiStyled } from '@mui/material';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

export const SeparatorIcon = muiStyled(CircleIcon)(({ theme }) => ({
  fontSize: '0.25rem',
  color: theme.palette.text.secondary,
}));

export const HomeIcon = muiStyled(HomeOutlinedIcon)(({ theme }) => ({
  fontSize: '1.25rem',
  color: theme.palette.primary.main,
}));

export const CustomBreadcrumbs = muiStyled(Breadcrumbs)(({ theme }) => ({
  marginTop: '0.5rem',
  'li.MuiBreadcrumbs-li:first-of-type': {
    '& a p': {
      display: 'flex',
      alignItems: 'flex-start',
    },
  },
  'li.MuiBreadcrumbs-li:last-of-type': {
    '& a': {
      cursor: 'default',
      '& p': {
        display: 'flex',
        color: theme.palette.text.secondary,
      },
    },
  },
}));

export const CustomLink = styled(NavLink)`
  p {
    color: ${({ theme }) => theme.COLORS.primary};
  }
`;
