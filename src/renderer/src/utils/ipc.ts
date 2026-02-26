/**
 * Deep-clones data returned from Electron's contextBridge.
 *
 * contextBridge.exposeInMainWorld deeply freezes every object that crosses the
 * bridge boundary.  When those frozen objects are later stored in React state,
 * React 19's reconciler may attempt to write internal bookkeeping properties
 * (e.g. `lanes`, `pendingLanes`) on them, which throws:
 *
 *   "Cannot assign to read only property 'pendingLanes' of object '#<FiberRootNode>'"
 *
 * Cloning via JSON round-trip produces a mutable copy that React can safely
 * manage.
 */
export function cloneIpcData<T>(data: T): T {
  if (data == null || typeof data !== 'object') return data;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Wraps an IPC controller proxy so that every method call automatically
 * deep-clones the frozen result returned by contextBridge.
 *
 * Usage:
 *   const safeApi = unfreezeIpcProxy(window.electronAPI.azureDevOps);
 */
export function unfreezeIpcProxy<T extends Record<string, unknown>>(
  proxy: T,
): T {
  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          const result = await (value as (...a: unknown[]) => Promise<unknown>)(
            ...args,
          );
          return cloneIpcData(result);
        };
      }
      return value;
    },
  };
  return new Proxy(proxy, handler);
}
