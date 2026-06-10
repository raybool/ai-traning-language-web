import { FC } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { store } from '../../store';
import { I18nProvider } from './I18nProvider';
import { ProviderProps } from './types';

export const Providers: FC<ProviderProps> = ({ children }) => (
  <I18nProvider>
    <ReduxProvider store={store}>{children}</ReduxProvider>
  </I18nProvider>
);
