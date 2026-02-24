import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { UpdateState } from '@shared/interfaces/types/auto-updater.types';
import { UpdateModal } from '@renderer/components/UpdateModal';
import { useSnackbar } from 'notistack';
interface UpdateModalContextType {
  updateState: UpdateState;
  showModal: () => void;
  hideModal: () => void;
}
const UpdateModalContext = createContext<UpdateModalContextType | null>(null);
const INITIAL_STATE: UpdateState = { status: 'idle' };
const SNACKBAR_MESSAGES = {
  downloading: 'Baixando atualização em segundo plano...',
  downloaded: 'Atualização baixada! Será instalada ao fechar o aplicativo.',
  error: (msg: string) => `Erro na atualização: ${msg}`,
} as const;
export function UpdateModalProvider({ children }: { children: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateState, setUpdateState] = useState<UpdateState>(INITIAL_STATE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userDeclined, setUserDeclined] = useState(false);
  useEffect(() => {
    window.electronAPI.autoUpdater.getUpdateState().then(setUpdateState);
    const unsubscribe = window.electronAPI.onAutoUpdaterStatus((state) => {
      setUpdateState(state);
      const shouldStopProcessing =
        state.status === 'downloading' ||
        state.status === 'downloaded' ||
        state.status === 'error';
      if (shouldStopProcessing) {
        setIsProcessing(false);
      }
      if (state.status === 'available' && !userDeclined) {
        setIsModalOpen(true);
      }
      if (state.status === 'downloaded' && userDeclined) {
        enqueueSnackbar(SNACKBAR_MESSAGES.downloaded, { variant: 'success' });
      }
      // Erros de conexão são tratados silenciosamente - apenas exibe no status do botão
      // Não mostra snackbar para não incomodar o usuário
    });
    return unsubscribe;
  }, [userDeclined, enqueueSnackbar]);
  const canCloseModal = useCallback(() => {
    return !isProcessing && updateState.status !== 'downloading';
  }, [isProcessing, updateState.status]);
  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  const hideModal = useCallback(() => {
    if (canCloseModal()) {
      setIsModalOpen(false);
    }
  }, [canCloseModal]);
  const handleUpdateNow = useCallback(async () => {
    setIsProcessing(true);
    setUserDeclined(false);
    try {
      await window.electronAPI.autoUpdater.downloadUpdate();
    } catch {
      setIsProcessing(false);
    }
  }, []);
  const handleUpdateLater = useCallback(async () => {
    setIsProcessing(true);
    setUserDeclined(true);
    try {
      await window.electronAPI.autoUpdater.downloadUpdate();
      setIsModalOpen(false);
      enqueueSnackbar(SNACKBAR_MESSAGES.downloading, { variant: 'info' });
    } catch {
      setIsProcessing(false);
    }
  }, [enqueueSnackbar]);
  const handleInstall = useCallback(() => {
    setIsProcessing(true);
    window.electronAPI.autoUpdater.installUpdate();
  }, []);
  const handleClose = useCallback(() => {
    if (canCloseModal()) {
      setIsModalOpen(false);
    }
  }, [canCloseModal]);
  const contextValue = useMemo(
    () => ({ updateState, showModal, hideModal }),
    [updateState, showModal, hideModal],
  );
  return (
    <UpdateModalContext.Provider value={contextValue}>
      {children}
      <UpdateModal
        open={isModalOpen}
        updateState={updateState}
        isProcessing={isProcessing}
        onUpdateNow={handleUpdateNow}
        onUpdateLater={handleUpdateLater}
        onInstall={handleInstall}
        onClose={handleClose}
      />
    </UpdateModalContext.Provider>
  );
}
export function useUpdateModal(): UpdateModalContextType {
  const context = useContext(UpdateModalContext);
  if (!context) {
    throw new Error('useUpdateModal must be used within UpdateModalProvider');
  }
  return context;
}
