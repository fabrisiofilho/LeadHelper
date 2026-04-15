import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type PropsWithChildren,
} from 'react';
import type { TaskStatusChange } from '@shared/interfaces/config/index.types';

/** A single notification entry stored in the center. */
export interface NotificationEntry {
  id: string;
  timestamp: Date;
  changes: TaskStatusChange[];
  read: boolean;
}

interface NotificationCenterContextValue {
  notifications: NotificationEntry[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
  /** Callback set by the component that can open a task by externalId */
  openTask: (externalId: string) => void;
  setOpenTaskHandler: (handler: (externalId: string) => void) => void;
}

const NotificationCenterContext =
  createContext<NotificationCenterContextValue | null>(null);

const MAX_NOTIFICATIONS = 50;

export function NotificationCenterProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const openTaskHandlerRef = useRef<(externalId: string) => void>(() => {});

  // Listen for status change events from backend
  useEffect(() => {
    const unsub = window.electronAPI.onSyncTaskStatusChanges(
      (changes: TaskStatusChange[]) => {
        if (!changes || changes.length === 0) return;
        const entry: NotificationEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date(),
          changes,
          read: false,
        };
        setNotifications((prev) =>
          [entry, ...prev].slice(0, MAX_NOTIFICATIONS),
        );
      },
    );
    return unsub;
  }, []);

  // Listen for "open task" events from native notification clicks
  useEffect(() => {
    const unsub = window.electronAPI.onSyncOpenTask((externalId: string) => {
      console.log('[NotificationCenter] Received open-task event:', externalId);
      // If no handler registered yet, queue it and retry after a short delay
      if (openTaskHandlerRef.current) {
        openTaskHandlerRef.current(externalId);
      }
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const openTask = useCallback((externalId: string) => {
    openTaskHandlerRef.current(externalId);
  }, []);

  const setOpenTaskHandler = useCallback(
    (handler: (externalId: string) => void) => {
      openTaskHandlerRef.current = handler;
    },
    [],
  );

  return (
    <NotificationCenterContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        clear,
        openTask,
        setOpenTaskHandler,
      }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) {
    throw new Error(
      'useNotificationCenter must be used within NotificationCenterProvider',
    );
  }
  return ctx;
}
