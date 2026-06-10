'use client';

import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useSession } from './useSession';
import { selectAppBootstrap, selectSession } from '../store/selectors';
import { loadAppBootstrapThunk } from '../store/slices/appBootstrapSlice';

export function useAppBootstrap() {
  const dispatch = useAppDispatch();
  useSession();
  const session = useAppSelector(selectSession);
  const appBootstrap = useAppSelector(selectAppBootstrap);

  useEffect(() => {
    if (!session.loading && !session.error && session.accessToken) {
      void dispatch(loadAppBootstrapThunk());
    }
  }, [dispatch, session.accessToken, session.error, session.loading]);

  return {
    session,
    ...appBootstrap,
  };
}
