import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined';
import Search from '@mui/icons-material/Search';
import { styled } from '@mui/material';

export const SearchIcon = styled(Search)(({ theme }) => ({
  fontSize: '1.5rem',
  color: theme.palette.text.secondary,
}));

export const BackspaceIcon = styled(BackspaceOutlined)(({ theme }) => ({
  fontSize: '1.3rem',
  color: theme.palette.text.secondary,
}));
