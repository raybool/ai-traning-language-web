'use client';

import { LOCALE_STORAGE_KEY } from '@/constants/keys';
import { Locale, messages, normalizeLocale } from '@/lib/i18n';
import { getTelegramWebApp } from '@/lib/telegram';
import {
  FC,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ProviderProps } from '../types';
import { I18nContextType } from './types';

export const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: FC<ProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const normalizedFromStorage = normalizeLocale(fromStorage);

    if (normalizedFromStorage) {
      setLocaleState(normalizedFromStorage);
      return;
    }

    const webApp = getTelegramWebApp();
    const next = normalizeLocale(
      webApp?.initDataUnsafe?.user?.language_code ?? null
    );

    if (next) {
      setLocaleState(next);
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextType>(
    () => ({
      locale,
      t: (key) => messages[locale][key] ?? key,
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
