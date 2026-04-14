import { useEffect, useState, useCallback } from 'react';
import { IconButton, Tooltip, Stack, Typography, Badge } from '@mui/material';
import {
  Sync as SyncIcon,
  CloudOff as CloudOffIcon,
  CloudDone as CloudDoneIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { SyncProgressModal } from '@renderer/components/SyncProgressModal';

interface SyncStatus {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  isSyncing: boolean;
  isConfigured: boolean;
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function SyncStatusIndicator() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    nextSyncAt: null,
    isSyncing: false,
    isConfigured: false,
  });
  const [showSyncModal, setShowSyncModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await window.electronAPI.sync.getStatus();
      if (res.success && res.data) setStatus(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const unsub = window.electronAPI.onSyncStatusChanged((s) => {
      setStatus(s);
      // Auto-open modal when backend starts syncing (auto-sync or otherwise)
      if (s.isSyncing) {
        setShowSyncModal(true);
      }
    });
    const interval = setInterval(fetchStatus, 30_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchStatus]);

  const handleClick = useCallback(() => {
    if (!status.isConfigured) {
      navigate('/panel/azure-devops');
      return;
    }
    if (status.isSyncing) return;
    // Modal will open automatically via onSyncStatusChanged when isSyncing becomes true
    window.electronAPI.azureDevOps.fullSync().finally(() => fetchStatus());
  }, [status.isConfigured, status.isSyncing, navigate, fetchStatus]);

  const handleCloseSyncModal = useCallback(() => {
    setShowSyncModal(false);
  }, []);

  const tooltipText = !status.isConfigured
    ? 'Azure DevOps não configurado. Clique para configurar.'
    : status.isSyncing
      ? 'Sincronizando...'
      : `Última: ${formatTime(status.lastSyncAt)} | Próxima: ${formatTime(status.nextSyncAt)}`;

  return (
    <>
      <Tooltip title={tooltipText}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ cursor: 'pointer' }}
          onClick={handleClick}
        >
          {!status.isConfigured ? (
            <Badge
              variant="dot"
              color="error"
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <IconButton size="small" color="error">
                <CloudOffIcon fontSize="small" />
              </IconButton>
            </Badge>
          ) : status.isSyncing ? (
            <IconButton size="small" color="primary">
              <SyncIcon fontSize="small" className="sync-rotate" />
            </IconButton>
          ) : (
            <IconButton size="small" color="primary">
              <CloudDoneIcon fontSize="small" />
            </IconButton>
          )}
          {status.isConfigured && !status.isSyncing && (
            <Stack direction="column" spacing={0} sx={{ lineHeight: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}
              >
                Última: {formatTime(status.lastSyncAt)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}
              >
                Próxima: {formatTime(status.nextSyncAt)}
              </Typography>
            </Stack>
          )}
          {status.isSyncing && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ fontSize: '0.7rem' }}
            >
              Sincronizando...
            </Typography>
          )}
        </Stack>
      </Tooltip>

      <SyncProgressModal open={showSyncModal} onClose={handleCloseSyncModal} />

      <style>
        {`
          @keyframes sync-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .sync-rotate {
            animation: sync-rotate 1.5s linear infinite;
          }
        `}
      </style>
    </>
  );
}
