import { Show } from '@renderer/components/Show';
import { useAppSelector } from '@renderer/hooks/redux';
import { IconButton, Tooltip } from '@mui/material';
import { CloseIcon, Container, OpenIcon } from './styles';

type Props = {
  onClick: () => void;
};

export function DrawerArrowButton({ onClick }: Readonly<Props>) {
  const { compacted } = useAppSelector((state) => state.drawer);

  return (
    <Tooltip
      title={compacted ? 'Fixar menu' : 'Retrair menu'}
      placement="right"
      arrow
    >
      <Container>
        <IconButton onClick={onClick}>
          <Show>
            <Show.When isTrue={compacted}>
              <OpenIcon fontSize="large" />
            </Show.When>

            <Show.Else>
              <CloseIcon fontSize="large" />
            </Show.Else>
          </Show>
        </IconButton>
      </Container>
    </Tooltip>
  );
}
