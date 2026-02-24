import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

export const Container = styled(Box)({
  paddingLeft: '0.3rem',
  paddingBottom: '0.3rem',
});

export const CustomBadge = styled(Badge)(({ theme }) => ({
  '.MuiBadge-badge': {
    fontSize: '0.6rem',
    color: theme.palette.text.secondary,
  },
}));

export const AscIcon = styled(ArrowUpwardIcon)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.text.secondary,
}));

export const DescIcon = styled(ArrowDownwardIcon)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.text.secondary,
}));
