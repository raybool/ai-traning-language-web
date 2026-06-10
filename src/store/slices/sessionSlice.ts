import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { ensureWebappSession } from '../../lib/session';
import { initTelegramWebApp } from '../../lib/telegram';
import type { RootState } from '../index';

type SessionState = {
  loading: boolean;
  initialized: boolean;
  error: string;
  accessToken: string;
  telegramId: number | null;
};

const initialState: SessionState = {
  loading: false,
  initialized: false,
  error: '',
  accessToken: '',
  telegramId: null,
};

const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_WEBAPP_DEV_AUTH === 'true';

export const bootstrapSessionThunk = createAsyncThunk<
  { accessToken: string; telegramId: number },
  void,
  { state: RootState; rejectValue: string }
>(
  'session/bootstrap',
  async (_, { rejectWithValue }) => {
    const webApp = initTelegramWebApp();
    if (!webApp && !DEV_AUTH_ENABLED) {
      return rejectWithValue('Open this page inside Telegram Mini App');
    }

    try {
      return await ensureWebappSession();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Authentication failed'
      );
    }
  },
  {
    condition: (_, { getState }) => {
      const session = getState().session;
      return !session.loading && !session.initialized;
    },
  }
);

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    resetSession(state) {
      state.loading = false;
      state.initialized = false;
      state.error = '';
      state.accessToken = '';
      state.telegramId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSessionThunk.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(bootstrapSessionThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = '';
        state.accessToken = action.payload.accessToken;
        state.telegramId = action.payload.telegramId;
      })
      .addCase(bootstrapSessionThunk.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = action.payload ?? 'Authentication failed';
        state.accessToken = '';
        state.telegramId = null;
      });
  },
});

export const { resetSession } = sessionSlice.actions;

export default sessionSlice.reducer;
