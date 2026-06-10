import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  LessonListItem,
  MySubscription,
  ProgressSummary,
  getCurrentUser,
  getCurrentLesson,
  getLessons,
  getMySubscription,
  getProgressSummary,
} from '../../lib/api';
import type { RootState } from '../index';

type AppBootstrapState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  currentCourseId: number | null;
  lessons: LessonListItem[];
  currentLesson: LessonListItem | null;
  subscription: MySubscription | null;
  subscriptionRequired: boolean;
  subscriptionError: string;
  progressSummary: ProgressSummary | null;
  progressError: string;
  courseProgressSummary: ProgressSummary | null;
  courseProgressError: string;
  courseProgressLastLoadedKey: string;
  lastLoadedKey: string;
};

type AppBootstrapPayload = {
  error: string;
  currentCourseId: number | null;
  lessons: LessonListItem[];
  currentLesson: LessonListItem | null;
  subscription: MySubscription | null;
  subscriptionRequired: boolean;
  subscriptionError: string;
  progressSummary: ProgressSummary | null;
  progressError: string;
  courseProgressSummary?: ProgressSummary | null;
  courseProgressError?: string;
  courseProgressLastLoadedKey?: string;
  lastLoadedKey: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getSessionKey(state: RootState): string {
  const { telegramId, accessToken } = state.session;
  if (!telegramId || !accessToken) {
    return '';
  }

  return `${telegramId}:${accessToken}`;
}

function requireSession(state: RootState): {
  accessToken: string;
  telegramId: number;
  key: string;
} {
  const { accessToken, telegramId } = state.session;
  if (!accessToken || !telegramId) {
    throw new Error('Session is not ready');
  }

  return {
    accessToken,
    telegramId,
    key: `${telegramId}:${accessToken}`,
  };
}

function resolveTimeZone(): string {
  if (typeof Intl === 'undefined') {
    return 'UTC';
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function isSubscriptionRequired(subscription: MySubscription | null): boolean {
  if (!subscription) {
    return false;
  }

  return (
    subscription.status !== 'active' &&
    subscription.freeGenerationsUsed >= subscription.freeGenerationsLimit
  );
}

async function loadLessonsData(accessToken: string) {
  const user = await getCurrentUser(accessToken);
  if (!user.currentCourseId) {
    return {
      currentCourseId: null,
      lessons: [] as LessonListItem[],
      currentLesson: null as LessonListItem | null,
      error: '',
    };
  }

  try {
    const [lessons, currentLesson] = await Promise.all([
      getLessons(user.currentCourseId, accessToken),
      getCurrentLesson(accessToken),
    ]);

    return {
      currentCourseId: user.currentCourseId,
      lessons,
      currentLesson,
      error: '',
    };
  } catch (error) {
    return {
      currentCourseId: user.currentCourseId,
      lessons: [] as LessonListItem[],
      currentLesson: null as LessonListItem | null,
      error: getErrorMessage(error, 'Failed to load lessons'),
    };
  }
}

const initialState: AppBootstrapState = {
  status: 'idle',
  error: '',
  currentCourseId: null,
  lessons: [],
  currentLesson: null,
  subscription: null,
  subscriptionRequired: false,
  subscriptionError: '',
  progressSummary: null,
  progressError: '',
  courseProgressSummary: null,
  courseProgressError: '',
  courseProgressLastLoadedKey: '',
  lastLoadedKey: '',
};

export const loadAppBootstrapThunk = createAsyncThunk<
  AppBootstrapPayload,
  { force?: boolean } | void,
  { state: RootState; rejectValue: string }
>(
  'appBootstrap/load',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken, telegramId, key } = requireSession(getState());

      const lessonsPromise = loadLessonsData(accessToken);
      const subscriptionPromise = getMySubscription(accessToken)
        .then((subscription) => ({
          subscription,
          subscriptionError: '',
        }))
        .catch((error) => ({
          subscription: null as MySubscription | null,
          subscriptionError: getErrorMessage(
            error,
            'Failed to load subscription'
          ),
        }));
      const progressPromise = getProgressSummary(
        resolveTimeZone(),
        accessToken,
        'all',
      )
        .then((progressSummary) => ({
          progressSummary,
          progressError: '',
        }))
        .catch((error) => ({
          progressSummary: null as ProgressSummary | null,
          progressError: getErrorMessage(error, 'Failed to load progress'),
        }));

      const [lessonsData, subscriptionData, progressData] = await Promise.all([
        lessonsPromise,
        subscriptionPromise,
        progressPromise,
      ]);

      return {
        error: lessonsData.error,
        currentCourseId: lessonsData.currentCourseId,
        lessons: lessonsData.lessons,
        currentLesson: lessonsData.currentLesson,
        subscription: subscriptionData.subscription,
        subscriptionRequired: isSubscriptionRequired(subscriptionData.subscription),
        subscriptionError: subscriptionData.subscriptionError,
        progressSummary: progressData.progressSummary,
        progressError: progressData.progressError,
        lastLoadedKey: key,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to bootstrap app'));
    }
  },
  {
    condition: (arg, { getState }) => {
      const state = getState();
      const key = getSessionKey(state);
      if (!key) {
        return false;
      }
      if (arg?.force) {
        return true;
      }

      return !(
        state.appBootstrap.lastLoadedKey === key &&
        (state.appBootstrap.status === 'loading' ||
          state.appBootstrap.status === 'ready')
      );
    },
  }
);

export const refreshLessonsThunk = createAsyncThunk<
  Pick<
    AppBootstrapPayload,
    'currentCourseId' | 'lessons' | 'currentLesson' | 'error' | 'lastLoadedKey'
  >,
  void,
  { state: RootState; rejectValue: string }
>('appBootstrap/refreshLessons', async (_, { getState, rejectWithValue }) => {
  try {
    const { accessToken, key } = requireSession(getState());
    const lessonsData = await loadLessonsData(accessToken);

    return {
      currentCourseId: lessonsData.currentCourseId,
      lessons: lessonsData.lessons,
      currentLesson: lessonsData.currentLesson,
      error: lessonsData.error,
      lastLoadedKey: key,
    };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to refresh lessons'));
  }
});

export const refreshSubscriptionThunk = createAsyncThunk<
  Pick<
    AppBootstrapPayload,
    'subscription' | 'subscriptionRequired' | 'subscriptionError' | 'lastLoadedKey'
  >,
  void,
  { state: RootState; rejectValue: string }
>('appBootstrap/refreshSubscription', async (_, { getState, rejectWithValue }) => {
  try {
    const { accessToken, key } = requireSession(getState());
    try {
      const subscription = await getMySubscription(accessToken);
      return {
        subscription,
        subscriptionRequired: isSubscriptionRequired(subscription),
        subscriptionError: '',
        lastLoadedKey: key,
      };
    } catch (error) {
      return {
        subscription: null,
        subscriptionRequired: false,
        subscriptionError: getErrorMessage(
          error,
          'Failed to load subscription'
        ),
        lastLoadedKey: key,
      };
    }
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, 'Failed to refresh subscription')
    );
  }
});

export const refreshProgressThunk = createAsyncThunk<
  Pick<AppBootstrapPayload, 'progressSummary' | 'progressError' | 'lastLoadedKey'>,
  void,
  { state: RootState; rejectValue: string }
>('appBootstrap/refreshProgress', async (_, { getState, rejectWithValue }) => {
  try {
    const { accessToken, key } = requireSession(getState());
    try {
      const progressSummary = await getProgressSummary(
        resolveTimeZone(),
        accessToken,
        'all',
      );
      return {
        progressSummary,
        progressError: '',
        lastLoadedKey: key,
      };
    } catch (error) {
      return {
        progressSummary: null,
        progressError: getErrorMessage(error, 'Failed to load progress'),
        lastLoadedKey: key,
      };
    }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to refresh progress'));
  }
});

export const refreshCourseProgressThunk = createAsyncThunk<
  Pick<
    AppBootstrapState,
    'courseProgressSummary' | 'courseProgressError' | 'courseProgressLastLoadedKey'
  >,
  { force?: boolean } | void,
  { state: RootState; rejectValue: string }
>(
  'appBootstrap/refreshCourseProgress',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { accessToken, key } = requireSession(state);
      const currentCourseId = state.appBootstrap.currentCourseId;
      if (!currentCourseId) {
        return {
          courseProgressSummary: null,
          courseProgressError: '',
          courseProgressLastLoadedKey: '',
        };
      }

      try {
        const courseProgressSummary = await getProgressSummary(
          resolveTimeZone(),
          accessToken,
          'current_course',
        );
        return {
          courseProgressSummary,
          courseProgressError: '',
          courseProgressLastLoadedKey: `${key}:${currentCourseId}`,
        };
      } catch (error) {
        return {
          courseProgressSummary: null,
          courseProgressError: getErrorMessage(
            error,
            'Failed to load course progress',
          ),
          courseProgressLastLoadedKey: `${key}:${currentCourseId}`,
        };
      }
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, 'Failed to refresh course progress'),
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const state = getState();
      const key = getSessionKey(state);
      if (!key || !state.appBootstrap.currentCourseId) {
        return false;
      }
      if (arg?.force) {
        return true;
      }
      return (
        state.appBootstrap.courseProgressLastLoadedKey !==
        `${key}:${state.appBootstrap.currentCourseId}`
      );
    },
  },
);

export const appBootstrapSlice = createSlice({
  name: 'appBootstrap',
  initialState,
  reducers: {
    clearAppBootstrap(state) {
      Object.assign(state, initialState);
    },
    setSubscriptionRequired(state, action: PayloadAction<boolean>) {
      state.subscriptionRequired = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAppBootstrapThunk.pending, (state) => {
        state.status = 'loading';
        state.error = '';
      })
      .addCase(loadAppBootstrapThunk.fulfilled, (state, action) => {
        state.status = action.payload.error ? 'error' : 'ready';
        state.error = action.payload.error;
        state.currentCourseId = action.payload.currentCourseId;
        state.lessons = action.payload.lessons;
        state.currentLesson = action.payload.currentLesson;
        state.subscription = action.payload.subscription;
        state.subscriptionRequired = action.payload.subscriptionRequired;
        state.subscriptionError = action.payload.subscriptionError;
        state.progressSummary = action.payload.progressSummary;
        state.progressError = action.payload.progressError;
        state.lastLoadedKey = action.payload.lastLoadedKey;
        state.courseProgressSummary = null;
        state.courseProgressError = '';
        state.courseProgressLastLoadedKey = '';
      })
      .addCase(loadAppBootstrapThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Failed to bootstrap app';
      })
      .addCase(refreshLessonsThunk.fulfilled, (state, action) => {
        const previousCourseId = state.currentCourseId;
        state.status = action.payload.error ? 'error' : 'ready';
        state.error = action.payload.error;
        state.currentCourseId = action.payload.currentCourseId;
        state.lessons = action.payload.lessons;
        state.currentLesson = action.payload.currentLesson;
        state.lastLoadedKey = action.payload.lastLoadedKey;
        if (previousCourseId !== action.payload.currentCourseId) {
          state.courseProgressSummary = null;
          state.courseProgressError = '';
          state.courseProgressLastLoadedKey = '';
        }
      })
      .addCase(refreshLessonsThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Failed to refresh lessons';
      })
      .addCase(refreshSubscriptionThunk.fulfilled, (state, action) => {
        state.subscription = action.payload.subscription;
        state.subscriptionRequired = action.payload.subscriptionRequired;
        state.subscriptionError = action.payload.subscriptionError;
        state.lastLoadedKey = action.payload.lastLoadedKey;
      })
      .addCase(refreshSubscriptionThunk.rejected, (state, action) => {
        state.subscriptionError =
          action.payload ?? 'Failed to refresh subscription';
      })
      .addCase(refreshProgressThunk.fulfilled, (state, action) => {
        state.progressSummary = action.payload.progressSummary;
        state.progressError = action.payload.progressError;
        state.lastLoadedKey = action.payload.lastLoadedKey;
      })
      .addCase(refreshProgressThunk.rejected, (state, action) => {
        state.progressError = action.payload ?? 'Failed to refresh progress';
      })
      .addCase(refreshCourseProgressThunk.fulfilled, (state, action) => {
        state.courseProgressSummary = action.payload.courseProgressSummary;
        state.courseProgressError = action.payload.courseProgressError;
        state.courseProgressLastLoadedKey =
          action.payload.courseProgressLastLoadedKey;
      })
      .addCase(refreshCourseProgressThunk.rejected, (state, action) => {
        state.courseProgressError =
          action.payload ?? 'Failed to refresh course progress';
      });
  },
});

export const { clearAppBootstrap, setSubscriptionRequired } =
  appBootstrapSlice.actions;

export default appBootstrapSlice.reducer;
