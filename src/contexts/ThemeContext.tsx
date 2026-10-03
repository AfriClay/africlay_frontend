import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { semanticColors, type ThemeMode } from '../theme/colors';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: (typeof semanticColors)[ThemeMode];
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: semanticColors.light,
  setMode: () => undefined,
  toggleMode: () => undefined,
});

export const ThemeProvider = ({ children, initialMode = 'light' }: PropsWithChildren<{ initialMode?: ThemeMode }>) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colors: semanticColors[mode],
    setMode,
    toggleMode: () => setMode(current => current === 'light' ? 'dark' : 'light'),
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);
