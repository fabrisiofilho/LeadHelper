import styled from 'styled-components';
import { IconButton, styled as muiStyled } from '@mui/material';

export const Form = styled.form`
  margin-top: 3.75rem;
  margin-bottom: 7.75rem;
`;

export const SocialLoginButton = muiStyled(IconButton)(({ theme }) => ({
  border: `0.125rem solid ${theme.palette.divider}`,
  padding: '1rem',
  '& + &': {
    marginLeft: '1.5rem',
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const SocialLoginIcon = styled.img`
  width: 1.25rem;
`;

export const HeaderImage = styled.img`
  width: 17.5rem;
  margin-left: 5rem;
`;
