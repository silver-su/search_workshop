"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
} from "react";
import type { ReactNode } from "react";
import zhTW, { type Translations } from "./locales/zh-TW";
import en from "./locales/en";

// ── 支援的語言 ─────────────────────────────────────────────────────────────
export type Locale = "zh-TW" | "en";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "zh-TW", label: "繁中" },
  { value: "en", label: "EN" },
];

const LOCALE_STORAGE_KEY = "ws_locale";

const TRANSLATIONS: Record<Locale, Translations> = {
  "zh-TW": zhTW,
  en,
};

// ── Context ────────────────────────────────────────────────────────────────
interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh-TW",
  setLocale: () => {},
  t: zhTW,
});

// ── Provider ───────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-TW");

  // 從 localStorage 讀取上次的語言偏好
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved && saved in TRANSLATIONS) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    }
  }, []);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: TRANSLATIONS[locale],
  };

  return createElement(I18nContext.Provider, { value }, children);
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useLocale() {
  return useContext(I18nContext);
}
