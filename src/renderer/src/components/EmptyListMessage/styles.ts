import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import { styled } from '@mui/material/styles';

type Props = {
  fontSize?: string;
};

export const AlertIcon = styled(ReportProblemRoundedIcon, {
  shouldForwardProp: (prop) => prop !== 'fontSize',
})<Props>(({ theme, fontSize }) => ({
  fontSize: fontSize || '4.8rem',
  color: theme.palette.warning.main,
}));
