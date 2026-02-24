import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { LogoutLoading } from '@renderer/pages/Loading/LogoutLoading';
interface LogoutLoadingContextData {
  showLogoutLoading: () => void;
  hideLogoutLoading: () => void;
}
const LogoutLoadingContext = createContext<LogoutLoadingContextData>(
  {} as LogoutLoadingContextData,
);
interface LogoutLoadingProviderProps {
  children: ReactNode;
}
export function LogoutLoadingProvider({
  children,
}: LogoutLoadingProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const showLogoutLoading = useCallback(() => {
    setIsVisible(true);
  }, []);
  const hideLogoutLoading = useCallback(() => {
    setIsVisible(false);
  }, []);
  return (
    <LogoutLoadingContext.Provider
      value={{ showLogoutLoading, hideLogoutLoading }}
    >
      {isVisible ? <LogoutLoading /> : children}
    </LogoutLoadingContext.Provider>
  );
}
export function useLogoutLoading(): LogoutLoadingContextData {
  const context = useContext(LogoutLoadingContext);
  if (!context) {
    throw new Error(
      'useLogoutLoading must be used within a LogoutLoadingProvider',
    );
  }
  return context;
}
