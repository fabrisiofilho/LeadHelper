import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined';
import { styled } from '@mui/material';

export const BackspaceIcon = styled(BackspaceOutlined)(({ theme }) => ({
  fontSize: '1.3rem',
  color: theme.palette.text.secondary,
}));
