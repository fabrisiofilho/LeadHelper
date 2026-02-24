import { useEffect, useState } from 'react';
import { Box, Typography, Tooltip, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadingIcon from '@mui/icons-material/Downloading';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useUpdateModal } from '@renderer/hooks/updateModal';
const VersionContainer = styled(Box)<{ compacted?: boolean }>(
  ({ compacted }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: compacted ? '0.75rem' : '0.75rem 1rem',
    minHeight: '3rem',
    width: '100%',
    alignSelf: 'stretch',
    transition: 'all 0.2s ease-in-out',
  }),
);
const VersionText = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  fontWeight: 500,
}));
const StatusButton = styled(Box)<{ clickable?: boolean }>(
  ({ theme, clickable }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    cursor: clickable ? 'pointer' : 'default',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    transition: 'background-color 0.2s',
    '&:hover': clickable
      ? {
          backgroundColor: theme.palette.action.hover,
        }
      : {},
  }),
);
type Props = {
  compacted?: boolean;
};
export function AppVersion({ compacted = false }: Props) {
  const [version, setVersion] = useState<string>('');
  const { updateState, showModal } = useUpdateModal();
  useEffect(() => {
    window.electronAPI.autoUpdater.getAppVersion().then(setVersion);
  }, []);
  const handleClick = () => {
    if (
      updateState.status === 'available' ||
      updateState.status === 'downloaded' ||
      updateState.status === 'downloading'
    ) {
      showModal();
    }
  };
  const renderStatusIndicator = () => {
    switch (updateState.status) {
      case 'checking':
        return (
          <Tooltip title="Verificando atualizações...">
            <StatusButton>
              <CircularProgress size={16} />
              {!compacted && (
                <Typography variant="caption" color="text.secondary">
                  Verificando...
                </Typography>
              )}
            </StatusButton>
          </Tooltip>
        );
      case 'available':
        return (
          <Tooltip
            title={`Nova versão disponível: ${updateState.info?.version}. Clique para atualizar.`}
          >
            <StatusButton clickable onClick={handleClick}>
              <SystemUpdateAltIcon
                sx={{ fontSize: 16, color: 'primary.main' }}
              />
              {!compacted && (
                <Typography variant="caption" color="primary">
                  Atualização disponível
                </Typography>
              )}
            </StatusButton>
          </Tooltip>
        );
      case 'downloading':
        return (
          <Tooltip
            title={`Baixando: ${updateState.progress?.percent?.toFixed(0) || 0}%`}
          >
            <StatusButton clickable onClick={handleClick}>
              <DownloadingIcon sx={{ fontSize: 16, color: 'info.main' }} />
              {!compacted && (
                <Typography variant="caption" color="info.main">
                  Baixando {updateState.progress?.percent?.toFixed(0) || 0}%
                </Typography>
              )}
            </StatusButton>
          </Tooltip>
        );
      case 'downloaded':
        return (
          <Tooltip title="Atualização pronta. Clique para instalar ou será instalada ao fechar.">
            <StatusButton clickable onClick={handleClick}>
              <CheckCircleOutlineIcon
                sx={{ fontSize: 16, color: 'success.main' }}
              />
              {!compacted && (
                <Typography variant="caption" color="success.main">
                  Pronto para instalar
                </Typography>
              )}
            </StatusButton>
          </Tooltip>
        );
      case 'error':
        return (
          <Tooltip title={`Erro: ${updateState.error}`}>
            <StatusButton>
              <ScheduleIcon sx={{ fontSize: 16, color: 'error.main' }} />
              {!compacted && (
                <Typography variant="caption" color="error.main">
                  Erro na atualização
                </Typography>
              )}
            </StatusButton>
          </Tooltip>
        );
      default:
        return null;
    }
  };
  if (compacted) {
    return (
      <Tooltip title={`Versão ${version}`}>
        <VersionContainer compacted>
          {renderStatusIndicator() || (
            <Typography variant="caption" color="text.secondary">
              v{version}
            </Typography>
          )}
        </VersionContainer>
      </Tooltip>
    );
  }
  return (
    <VersionContainer>
      <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
        {renderStatusIndicator()}
        <VersionText>Versão {version}</VersionText>
      </Box>
    </VersionContainer>
  );
}
