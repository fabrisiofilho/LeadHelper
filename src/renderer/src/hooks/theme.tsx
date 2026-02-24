import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
export type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'leadhelper-theme';
interface ThemeContextData {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isDarkMode: boolean;
}
const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);
export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    return 'light';
  });
  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);
  const isDarkMode = useMemo(() => themeMode === 'dark', [themeMode]);
  const value = useMemo(
    () => ({
      themeMode,
      toggleTheme,
      isDarkMode,
    }),
    [themeMode, toggleTheme, isDarkMode],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
export function useTheme(): ThemeContextData {
  const context = useContext(ThemeContext);
  if (!context || Object.keys(context).length === 0) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
