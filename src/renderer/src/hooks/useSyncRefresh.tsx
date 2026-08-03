import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type PropsWithChildren,
} from 'react';

type RefreshCallback = () => void;

interface SyncRefreshContextValue {
  /**
   * Register a callback that will be invoked when a sync cycle completes.
   * Returns an unsubscribe function.
   */
  onSyncCompleted: (cb: RefreshCallback) => () => void;
}

const SyncRefreshContext = createContext<SyncRefreshContextValue | null>(null);

/**
 * Provider that listens to the `sync:completed` IPC event and notifies
 * all registered subscribers so they can refresh their data.
 *
 * Should be placed high in the component tree (inside WithHooks).
 */
export function SyncRefreshProvider({ children }: PropsWithChildren) {
  const listenersRef = useRef<Set<RefreshCallback>>(new Set());

  // Listen to the IPC event once, at provider mount
  useEffect(() => {
    const unsub = window.electronAPI.onSyncCompleted(() => {
      listenersRef.current.forEach((cb) => {
        try {
          cb();
        } catch {
          // individual callback errors should not break others
        }
      });
    });
    return unsub;
  }, []);

  const onSyncCompleted = useCallback((cb: RefreshCallback) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  return (
    <SyncRefreshContext.Provider value={{ onSyncCompleted }}>
      {children}
    </SyncRefreshContext.Provider>
  );
}

/**
 * Hook that registers a callback to be called whenever a sync cycle finishes.
 * The callback is automatically unregistered on unmount.
 *
 * @param callback - function to call after sync completes (e.g. re-fetch data)
 */
export function useSyncRefresh(callback: RefreshCallback): void {
  const ctx = useContext(SyncRefreshContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!ctx) return;
    const stableCallback = () => callbackRef.current();
    return ctx.onSyncCompleted(stableCallback);
  }, [ctx]);
}
