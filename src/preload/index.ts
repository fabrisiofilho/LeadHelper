import { contextBridge, ipcRenderer, shell } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import {
  CustomElectronAPI,
  IpcResultEvent,
  IPositionController,
  ITeamController,
  ISprintController,
  ITeamMemberController,
  ITaskController,
  IAllocationController,
  ITeamMemberAllocationController,
  IDashboardController,
  IAzureDevOpsController,
  ITaskStatusConfigController,
  ITaskCommentController,
} from '@shared/interfaces/config/index.types';
import {
  IAutoUpdaterController,
  UpdateState,
} from '@shared/interfaces/types/auto-updater.types';
import { IAuthController } from '@shared/interfaces/controllers/auth.controller.interface';
import { CONTROLLER_CONFIG } from './controller-config';
import './index.d';

import '@shared/config/dateFnsLocale';

console.log('PRELOAD LOADED!');
console.log('contextIsolated:', process.contextIsolated);

// Event emitter para resultados IPC (sucesso e erro)
type IpcResultCallback = (event: IpcResultEvent) => void;
const ipcResultListeners: Set<IpcResultCallback> = new Set();

/**
 * Creates a controller proxy that invokes IPC methods.
 * Each method call is translated to an ipcRenderer.invoke call with the appropriate channel.
 */
function createControllerFromConfig<T extends keyof typeof CONTROLLER_CONFIG>(
  controllerName: T,
): Record<
  (typeof CONTROLLER_CONFIG)[T]['methods'][number],
  (...args: unknown[]) => Promise<unknown>
> {
  const config = CONTROLLER_CONFIG[controllerName];
  const controller: Record<string, (...args: unknown[]) => Promise<unknown>> =
    {};

  for (const method of config.methods) {
    const channel = `${config.prefix}:${method}`;
    controller[method] = (...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args);
  }

  return controller as Record<
    (typeof CONTROLLER_CONFIG)[T]['methods'][number],
    (...args: unknown[]) => Promise<unknown>
  >;
}

// Create controller proxies for all team management controllers
// Type assertions are used because the IPC bridge returns Promise<unknown> at runtime
// but the actual responses match the interface types
const positionController = createControllerFromConfig(
  'position',
) as unknown as IPositionController;
const teamController = createControllerFromConfig(
  'team',
) as unknown as ITeamController;
const sprintController = createControllerFromConfig(
  'sprint',
) as unknown as ISprintController;
const teamMemberController = createControllerFromConfig(
  'teamMember',
) as unknown as ITeamMemberController;
const taskController = createControllerFromConfig(
  'task',
) as unknown as ITaskController;
const allocationController = createControllerFromConfig(
  'allocation',
) as unknown as IAllocationController;
const teamMemberAllocationController = createControllerFromConfig(
  'teamMemberAllocation',
) as unknown as ITeamMemberAllocationController;
const dashboardController = createControllerFromConfig(
  'dashboard',
) as unknown as IDashboardController;
const azureDevOpsController = createControllerFromConfig(
  'azureDevOps',
) as unknown as IAzureDevOpsController;
const autoUpdaterController = createControllerFromConfig(
  'autoUpdater',
) as unknown as IAutoUpdaterController;
const authController = createControllerFromConfig(
  'auth',
) as unknown as IAuthController;
const taskStatusConfigController = createControllerFromConfig(
  'taskStatusConfig',
) as unknown as ITaskStatusConfigController;
const taskCommentController = createControllerFromConfig(
  'taskComment',
) as unknown as ITaskCommentController;

const api: CustomElectronAPI = {
  // Team Management Controllers
  position: positionController,
  team: teamController,
  sprint: sprintController,
  teamMember: teamMemberController,
  task: taskController,
  allocation: allocationController,
  teamMemberAllocation: teamMemberAllocationController,
  dashboard: dashboardController,
  azureDevOps: azureDevOpsController,
  autoUpdater: autoUpdaterController,
  auth: authController,
  taskStatusConfig: taskStatusConfigController,
  taskComment: taskCommentController,

  // Utility methods
  openExternalUrl: (url: string) => {
    shell.openExternal(url);
  },

  onIpcResult: (callback: (event: IpcResultEvent) => void): (() => void) => {
    ipcResultListeners.add(callback);
    return () => {
      ipcResultListeners.delete(callback);
    };
  },

  onAutoUpdaterStatus: (
    callback: (state: UpdateState) => void,
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => {
      callback(state);
    };
    ipcRenderer.on('autoUpdater:statusUpdate', handler);
    return () => {
      ipcRenderer.removeListener('autoUpdater:statusUpdate', handler);
    };
  },
};

if (process.contextIsolated) {
  try {
    console.log('Exposing APIs via contextBridge...');
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('electronAPI', api);
    console.log('APIs exposed successfully!');
  } catch (error: unknown) {
    console.log('[ERROR] Error exposing APIs:', error);
  }
} else {
  window.electron = electronAPI;

  window.electronAPI = api;
}

export type PreloadAPI = CustomElectronAPI;
