import { PropsWithChildren } from 'react';
import { ConfirmModalProvider } from './confirmModal';
import { LogoutLoadingProvider } from './logoutLoading';
import { UpdateModalProvider } from './updateModal';
import { useIpcToastHandler } from './ipcToastHandler';

// Team Management Hooks
export { useTeamMembers } from './useTeamMembers';
export { useTasks } from './useTasks';
export { useAllocations } from './useAllocations';
export { useDashboard } from './useDashboard';
export { useAzureDevOps } from './useAzureDevOps';

function IpcToastHandler({ children }: PropsWithChildren) {
  useIpcToastHandler();
  return <>{children}</>;
}

export function WithHooks({ children }: PropsWithChildren) {
  return (
    <UpdateModalProvider>
      <ConfirmModalProvider>
        <LogoutLoadingProvider>
          <IpcToastHandler>{children}</IpcToastHandler>
        </LogoutLoadingProvider>
      </ConfirmModalProvider>
    </UpdateModalProvider>
  );
}
