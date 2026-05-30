import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_THEME,
  themes,
  type Theme,
  type ThemeColors,
  type ThemeKey,
} from "./themes";

const STORAGE_KEY = "giftwall.theme.v1";

type ThemeContextValue = {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (key: ThemeKey) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes[DEFAULT_THEME],
  colors: themes[DEFAULT_THEME].colors,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<ThemeKey>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in themes) setKey(saved as ThemeKey);
    });
  }, []);

  function setTheme(next: ThemeKey) {
    setKey(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[key], colors: themes[key].colors, setTheme }),
    [key],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Builds a StyleSheet from the active palette and memoizes it per theme.
export function useThemedStyles<T>(maker: (c: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => maker(colors), [colors, maker]);
}
