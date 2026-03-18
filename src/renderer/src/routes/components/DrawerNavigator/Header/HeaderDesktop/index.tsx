import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useTheme } from '@renderer/hooks/theme';
import { SignOutButton } from '../HeaderActions/SignOutButton';
import { SyncStatusIndicator } from '@renderer/components/SyncStatusIndicator';
import { Container } from './styles';

export function HeaderDesktop() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Container>
      <Stack direction="row" alignItems="center" gap="1.5rem">
        <Typography variant="h6" color="primary">
          LeadHelper
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" gap="1rem">
        <SyncStatusIndicator />
        <Tooltip title="Alternar tema">
          <IconButton onClick={toggleTheme} color="primary">
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
        <SignOutButton />
      </Stack>
    </Container>
  );
}
