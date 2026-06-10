import { ReactNode } from 'react';

import { Locale, MessageKey } from '../../../lib/i18n';

export type I18nContextType = {
  locale: Locale;
  t: (key: MessageKey) => string;
  setLocale: (locale: Locale) => void;
};
