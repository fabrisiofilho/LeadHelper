import CloseRounded from '@mui/icons-material/CloseRounded';
import { IconButton, Stack, Typography } from '@mui/material';
import { SignOutButton } from '../../HeaderActions/SignOutButton';
import { CustomDrawer } from './styles';

type Props = {
  onClose: () => void;
  open: boolean;
};

export function ProfileDrawer({ open, onClose }: Props) {
  return (
    <CustomDrawer anchor="top" open={open} onClose={onClose}>
      <Stack>
        <Stack direction="row" justifyContent="end" pt="0.25rem" pr="0.25rem">
          <IconButton onClick={onClose}>
            <CloseRounded />
          </IconButton>
        </Stack>

        <Stack pb="0.5rem" alignItems="stretch">
          <Stack alignItems="center" py={2}>
            <Typography variant="h6">LeadHelper</Typography>
          </Stack>

          <SignOutButton variant="listItem" onClick={onClose} />
        </Stack>
      </Stack>
    </CustomDrawer>
  );
}
