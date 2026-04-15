import { IconButton, Stack, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useTheme } from '@renderer/hooks/theme';
import { SignOutButton } from '../HeaderActions/SignOutButton';
import { SyncStatusIndicator } from '@renderer/components/SyncStatusIndicator';
import { NotificationCenter } from '@renderer/components/NotificationCenter';
import { Container } from './styles';

export function HeaderDesktop() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Container>
      <Stack direction="row" alignItems="center" />

      <Stack direction="row" alignItems="center" gap="1rem">
        <SyncStatusIndicator />
        <NotificationCenter />
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
