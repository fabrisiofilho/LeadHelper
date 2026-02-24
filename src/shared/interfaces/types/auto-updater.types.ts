export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string | null;
}
export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';
export interface UpdateState {
  status: UpdateStatus;
  info?: UpdateInfo;
  progress?: UpdateProgress;
  error?: string;
}
export interface IAutoUpdaterController {
  getAppVersion(): Promise<string>;
  checkForUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  getUpdateState(): Promise<UpdateState>;
}
