import { ElectronAPI } from '@electron-toolkit/preload';
import { CustomElectronAPI } from '../shared/interfaces/config/index.types';

declare global {
  interface Window {
    electron: ElectronAPI;
    electronAPI: CustomElectronAPI;
  }
}

export {};
