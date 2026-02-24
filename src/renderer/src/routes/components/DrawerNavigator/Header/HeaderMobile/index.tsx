import { useAppDispatch } from '@renderer/hooks/redux';
import { useTheme } from '@renderer/hooks/theme';
import { openDrawer } from '@renderer/redux/slices/drawer';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { LightMode, DarkMode } from '@mui/icons-material';
import { Badge, Box, IconButton, Tooltip } from '@mui/material';
import { useState } from 'react';
import { ProfileDrawer } from './ProfileDrawer';
import { Container } from './styles';

export function HeaderMobile() {
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const dispatch = useAppDispatch();

  const handleOpenMenuDrawer = () => {
    dispatch(openDrawer());
  };

  const handleOpenProfileDrawer = () => {
    setOpenProfileDrawer(true);
  };

  const handleCloseProfileDrawer = () => {
    setOpenProfileDrawer(false);
  };

  return (
    <>
      <Box>
        <Container>
          <IconButton onClick={handleOpenMenuDrawer}>
            <MenuRoundedIcon />
          </IconButton>

          {}

          <Box display="flex" alignItems="center" gap="0.5rem">
            <Tooltip title="Alternar tema">
              <IconButton onClick={toggleTheme} color="primary">
                {isDarkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>

            <IconButton onClick={handleOpenProfileDrawer}>
              <Badge variant="dot" color="error">
                <PersonRoundedIcon />
              </Badge>
            </IconButton>
          </Box>
        </Container>
      </Box>

      <ProfileDrawer
        open={openProfileDrawer}
        onClose={handleCloseProfileDrawer}
      />
    </>
  );
}
