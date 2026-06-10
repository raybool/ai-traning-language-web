import { configureStore } from '@reduxjs/toolkit';

import appBootstrapReducer from './slices/appBootstrapSlice';
import sessionReducer from './slices/sessionSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      appBootstrap: appBootstrapReducer,
      session: sessionReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });

export const store = makeStore();

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
