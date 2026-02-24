import 'reflect-metadata';

const IPC_METADATA_KEY = Symbol('ipc:methods');

export interface IpcMethodMetadata {
  methodName: string;
  channel: string;
}

export function IpcMethod(channel: string) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const ctor: new (...args: unknown[]) => object = target.constructor as new (
      ...args: unknown[]
    ) => object;

    const methods: IpcMethodMetadata[] =
      Reflect.getMetadata(IPC_METADATA_KEY, ctor) ?? [];

    methods.push({
      methodName: propertyKey,
      channel,
    });

    Reflect.defineMetadata(IPC_METADATA_KEY, methods, ctor);

    return descriptor;
  };
}

export function getIpcMethods(
  target: new (...args: unknown[]) => object,
): IpcMethodMetadata[] {
  return Reflect.getMetadata(IPC_METADATA_KEY, target) ?? [];
}
