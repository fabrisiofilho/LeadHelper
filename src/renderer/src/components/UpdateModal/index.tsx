import { memo, useMemo } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  UpdateState,
  UpdateStatus,
} from '@shared/interfaces/types/auto-updater.types';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Modal } from '../Modal';
const ContentContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1.5rem',
  padding: '1rem 0',
  flex: 1,
});
const IconContainer = styled(Box)<{ error?: boolean }>(({ theme, error }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  backgroundColor: error
    ? theme.palette.error.main + '15'
    : theme.palette.primary.main + '15',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));
const ProgressContainer = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});
const MODAL_WIDTH = '400px';
const MODAL_HEIGHT = '550px';
const ICON_SIZE = 40;
const LABELS = {
  titles: {
    error: 'Erro na Atualização',
    downloading: 'Baixando Atualização',
    downloaded: 'Atualização Pronta',
    available: 'Atualização Disponível',
  },
  confirm: {
    error: 'Tentar Novamente',
    processing: 'Iniciando...',
    downloading: 'Baixando...',
    installing: 'Instalando...',
    install: 'Instalar Agora',
    update: 'Atualizar Agora',
  },
  cancel: {
    error: 'Fechar',
    downloaded: 'Instalar ao Fechar',
    available: 'Mais Tarde',
  },
} as const;
type Props = {
  open: boolean;
  updateState: UpdateState;
  isProcessing: boolean;
  onUpdateNow: () => void;
  onUpdateLater: () => void;
  onInstall: () => void;
  onClose: () => void;
};
type ContentProps = {
  status: UpdateStatus;
  version: string;
  error?: string;
  progress?: number;
};
const UpdateIcon = memo(({ isError }: { isError: boolean }) => (
  <IconContainer error={isError}>
    {isError ? (
      <ErrorOutlineIcon sx={{ fontSize: ICON_SIZE, color: 'error.main' }} />
    ) : (
      <SystemUpdateAltIcon
        sx={{ fontSize: ICON_SIZE, color: 'primary.main' }}
      />
    )}
  </IconContainer>
));
UpdateIcon.displayName = 'UpdateIcon';
const ErrorContent = memo(({ error }: { error?: string }) => (
  <>
    <Typography variant="h6" textAlign="center" color="error.main">
      Falha ao atualizar
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      {error || 'Ocorreu um erro ao baixar a atualização.'}
      {'\n\n'}
      Verifique sua conexão com a internet e tente novamente.
    </Typography>
  </>
));
ErrorContent.displayName = 'ErrorContent';
const AvailableContent = memo(({ version }: { version: string }) => (
  <>
    <Typography variant="h6" textAlign="center">
      Nova versão {version}
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      Uma nova versão está disponível. Deseja atualizar agora?
      {'\n\n'}
      Se escolher &quot;Mais Tarde&quot;, a atualização será baixada em segundo
      plano e instalada automaticamente ao fechar o aplicativo.
    </Typography>
  </>
));
AvailableContent.displayName = 'AvailableContent';
const DownloadingContent = memo(
  ({ version, progress }: { version: string; progress?: number }) => (
    <>
      <Typography variant="body1" textAlign="center">
        Baixando versão {version}...
      </Typography>
      <ProgressContainer>
        <LinearProgress
          variant={progress ? 'determinate' : 'indeterminate'}
          value={progress || 0}
        />
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {progress ? `${progress.toFixed(0)}%` : 'Iniciando download...'}
        </Typography>
      </ProgressContainer>
    </>
  ),
);
DownloadingContent.displayName = 'DownloadingContent';
const DownloadedContent = memo(({ version }: { version: string }) => (
  <>
    <Typography variant="h6" textAlign="center" color="success.main">
      Download concluído!
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      A versão {version} está pronta para ser instalada.
      {'\n\n'}
      Clique em &quot;Instalar Agora&quot; para reiniciar e aplicar a
      atualização, ou &quot;Instalar ao Fechar&quot; para instalar
      automaticamente quando você fechar o aplicativo.
    </Typography>
  </>
));
DownloadedContent.displayName = 'DownloadedContent';
const ModalContent = memo(
  ({ status, version, error, progress }: ContentProps) => (
    <ContentContainer>
      <UpdateIcon isError={status === 'error'} />
      {status === 'error' && <ErrorContent error={error} />}
      {status === 'available' && <AvailableContent version={version} />}
      {status === 'downloading' && (
        <DownloadingContent version={version} progress={progress} />
      )}
      {status === 'downloaded' && <DownloadedContent version={version} />}
    </ContentContainer>
  ),
);
ModalContent.displayName = 'ModalContent';
function useModalLabels(
  status: UpdateStatus,
  isProcessing: boolean,
  isBlocked: boolean,
) {
  return useMemo(() => {
    const isError = status === 'error';
    const isDownloading = status === 'downloading';
    const isDownloaded = status === 'downloaded';
    const title =
      LABELS.titles[status as keyof typeof LABELS.titles] ||
      LABELS.titles.available;
    let confirmLabel: string;
    if (isError) {
      confirmLabel = LABELS.confirm.error;
    } else if (isProcessing && !isDownloading && !isDownloaded) {
      confirmLabel = LABELS.confirm.processing;
    } else if (isDownloading) {
      confirmLabel = LABELS.confirm.downloading;
    } else if (isDownloaded) {
      confirmLabel = isProcessing
        ? LABELS.confirm.installing
        : LABELS.confirm.install;
    } else {
      confirmLabel = LABELS.confirm.update;
    }
    let cancelLabel = '';
    if (!isBlocked) {
      if (isError) {
        cancelLabel = LABELS.cancel.error;
      } else if (isDownloaded) {
        cancelLabel = LABELS.cancel.downloaded;
      } else {
        cancelLabel = LABELS.cancel.available;
      }
    }
    return { title, confirmLabel, cancelLabel };
  }, [status, isProcessing, isBlocked]);
}
export const UpdateModal = memo(function UpdateModal({
  open,
  updateState,
  isProcessing,
  onUpdateNow,
  onUpdateLater,
  onInstall,
  onClose,
}: Props) {
  const { status, info, progress, error } = updateState;
  const version = info?.version || '';
  const isDownloading = status === 'downloading';
  const isDownloaded = status === 'downloaded';
  const isError = status === 'error';
  const isBlocked = isProcessing || isDownloading;
  const { title, confirmLabel, cancelLabel } = useModalLabels(
    status,
    isProcessing,
    isBlocked,
  );
  const handleConfirm = () => {
    if (isBlocked) return;
    if (isError || !isDownloaded) {
      onUpdateNow();
    } else {
      onInstall();
    }
  };
  const handleCancel = () => {
    if (isBlocked) return;
    if (isError || isDownloaded) {
      onClose();
    } else {
      onUpdateLater();
    }
  };
  const handleClose = () => {
    if (!isBlocked) onClose();
  };
  return (
    <Modal
      variant="form"
      open={open}
      title={title}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      loading={isProcessing}
      confirmDisabled={isBlocked}
      cancelDisabled={isBlocked}
      disabledCloseOnClickOutside
      hasCloseButton={!isBlocked}
      handleClose={handleClose}
      handleConfirm={handleConfirm}
      handleCancel={handleCancel}
      width={MODAL_WIDTH}
      height={MODAL_HEIGHT}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
        }}
      >
        <ModalContent
          status={status}
          version={version}
          error={error}
          progress={progress?.percent}
        />
      </Box>
    </Modal>
  );
});
