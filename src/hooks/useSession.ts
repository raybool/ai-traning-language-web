'use client';

import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { bootstrapSessionThunk } from '../store/slices/sessionSlice';

export function useSession() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);

  useEffect(() => {
    if (!session.initialized && !session.loading) {
      void dispatch(bootstrapSessionThunk());
    }
  }, [dispatch, session.initialized, session.loading]);

  return {
    loading: session.loading,
    initialized: session.initialized,
    error: session.error,
    accessToken: session.accessToken,
    telegramId: session.telegramId,
  };
}
