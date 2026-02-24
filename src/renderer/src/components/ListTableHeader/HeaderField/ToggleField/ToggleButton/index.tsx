import { Show } from '@renderer/components/Show';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { type ButtonProps } from '@mui/material';
import { CustomButton } from './styles';

type Props = ButtonProps & {
  active: boolean;
};

export function ToggleButton({ children, active, onClick }: Readonly<Props>) {
  return (
    <CustomButton active={active} onClick={onClick}>
      <Show.When isTrue={active}>
        <CheckCircleOutlineIcon fontSize="small" />
      </Show.When>

      {children}
    </CustomButton>
  );
}
