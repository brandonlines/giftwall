import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/components/ui/toast";
import type { ThemeKey } from "@/theme/themes";

// Alternate app icons are named per theme (see the @howincodes/expo-dynamic-app-icon
// plugin block in app.json). Switching among already-compiled icons is instant
// native work; the SELECTION and this whole layer are plain JS, so the picker
// ships and updates via OTA. Only adding a NEW icon design needs a rebuild.
export type AppIconKey = ThemeKey;
export const DEFAULT_APP_ICON: AppIconKey = "signature";
const STORAGE_KEY = "giftwall.appIcon.v1";

// Guard the native import: an OTA could reach a binary built before the plugin
// existed — there the native module is absent, so we no-op instead of crashing.
// (On web the package resolves to a no-op build.)
type DynamicIcon = {
  setAppIcon: (name: string | null, isInBackground?: boolean) => Promise<unknown>;
  getAppIcon: () => Promise<string>;
};
let dynamicIcon: DynamicIcon | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  dynamicIcon = require("@howincodes/expo-dynamic-app-icon");
} catch {
  dynamicIcon = null;
}

type AppIconContextValue = {
  iconKey: AppIconKey;
  setAppIcon: (next: AppIconKey) => void;
  available: boolean;
};

const AppIconContext = createContext<AppIconContextValue>({
  iconKey: DEFAULT_APP_ICON,
  setAppIcon: () => {},
  available: false,
});

export function AppIconProvider({ children }: { children: ReactNode }) {
  const showToast = useToast();
  const [iconKey, setKey] = useState<AppIconKey>(DEFAULT_APP_ICON);

  // Restore the persisted choice, then reconcile with the icon the OS actually
  // shows (covers iOS resetting it, or a fresh install).
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (active && saved) setKey(saved as AppIconKey);
    });
    dynamicIcon
      ?.getAppIcon()
      .then((current) => {
        if (active && current && current !== "DEFAULT") setKey(current as AppIconKey);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function setAppIcon(next: AppIconKey) {
    if (!dynamicIcon) {
      showToast("Update the app to change your icon", "info");
      return;
    }
    const prev = iconKey;
    setKey(next); // optimistic
    void AsyncStorage.setItem(STORAGE_KEY, next);
    const revert = () => {
      setKey(prev);
      void AsyncStorage.setItem(STORAGE_KEY, prev);
      showToast("Couldn't change the icon", "error");
    };
    // `signature` is the built-in default → reset with null. setAppIcon resolves
    // to `false` (not a throw) on failure, so handle both.
    Promise.resolve(dynamicIcon.setAppIcon(next === DEFAULT_APP_ICON ? null : next))
      .then((res) => {
        if (res === false) revert();
      })
      .catch(revert);
  }

  // Only state here is iconKey, so the provider re-renders (and rebuilds this
  // value) exactly when the icon changes — no useMemo needed.
  const value: AppIconContextValue = { iconKey, setAppIcon, available: dynamicIcon != null };

  return <AppIconContext.Provider value={value}>{children}</AppIconContext.Provider>;
}

export function useAppIcon() {
  return useContext(AppIconContext);
}
