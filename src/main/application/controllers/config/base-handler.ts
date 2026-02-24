import { BrowserWindow, ipcMain } from 'electron';
import { logger } from '@main/infrastructure/log/logger';
import {
  getIpcMethods,
  IpcMethodMetadata,
} from '@main/infrastructure/decorators/ipc.decorator';

export abstract class BaseHandler {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    const handler = this as unknown as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >;

    const ctor = this.constructor as new (...args: unknown[]) => object;
    const methods: IpcMethodMetadata[] = getIpcMethods(ctor);

    methods.forEach(({ methodName, channel }) => {
      ipcMain.handle(
        channel,
        async (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
          const method = handler[methodName];

          if (typeof method !== 'function') {
            throw new Error(
              `Method ${methodName} not found or is not a function on handler ${this.constructor.name}`,
            );
          }

          return await method.apply(this, args);
        },
      );
    });

    logger.info(
      `${this.constructor.name} registrado com ${methods.length} handlers`,
    );
  }

  protected broadcastEvent<T>(
    channel: string,
    eventName: string,
    data: T extends undefined ? null : T,
  ): void {
    const sanitized = data === undefined ? null : data;
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((w) => w.webContents.send(channel, eventName, sanitized));
  }
}
