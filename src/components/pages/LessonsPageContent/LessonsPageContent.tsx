'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import { useGenerationPolling } from '@/src/hooks/useGenerationPolling';
import type { GenerationFailedPayload } from '@/src/hooks/useGenerationPolling';
import { ApiError, generateNextLesson } from '@/src/lib/api';
import { useAppDispatch } from '@/src/store/hooks';
import {
  loadAppBootstrapThunk,
  refreshLessonsThunk,
  setSubscriptionRequired,
} from '@/src/store/slices/appBootstrapSlice';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

import styles from './LessonsPageContent.module.scss';

export const LessonsPageContent: FC = () => {
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    session,
    status,
    error,
    currentCourseId,
    currentLesson,
    subscriptionRequired,
  } = useAppBootstrap();
  const polling = useGenerationPolling();
  const [pageError, setPageError] = useState('');
  const autoPollingLessonIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => polling.stop();
  }, [polling.stop]);

  const handleGenerationFailed = useCallback(
    async (message: string, payload?: GenerationFailedPayload) => {
      setPageError(message);

      if (payload?.courseDeleted) {
        await dispatch(loadAppBootstrapThunk({ force: true }));
        router.replace('/courses?generationFailed=1');
        return;
      }

      await dispatch(refreshLessonsThunk());
    },
    [dispatch, router]
  );

  useEffect(() => {
    if (!session.accessToken || currentLesson?.status !== 'generating') {
      autoPollingLessonIdRef.current = null;
      return;
    }

    if (
      autoPollingLessonIdRef.current === currentLesson.id &&
      polling.state === 'pending'
    ) {
      return;
    }

    autoPollingLessonIdRef.current = currentLesson.id;
    polling.start(session.accessToken, {
      onCompleted: async () => {
        await dispatch(refreshLessonsThunk()).unwrap();
      },
      onFailed: handleGenerationFailed,
    });
  }, [
    currentLesson?.id,
    currentLesson?.status,
    dispatch,
    handleGenerationFailed,
    polling,
    session.accessToken,
  ]);

  const onGenerate = useCallback(async () => {
    if (!session.accessToken || !currentCourseId || subscriptionRequired) {
      return;
    }

    setPageError('');
    try {
      await generateNextLesson(
        { courseId: currentCourseId },
        session.accessToken
      );
      dispatch(setSubscriptionRequired(false));
      polling.start(session.accessToken, {
        onCompleted: async () => {
          await dispatch(refreshLessonsThunk()).unwrap();
        },
        onFailed: handleGenerationFailed,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        dispatch(setSubscriptionRequired(true));
      }
      setPageError(e instanceof Error ? e.message : t('auth_failed'));
      polling.setState('failed');
    }
  }, [
    currentCourseId,
    dispatch,
    handleGenerationFailed,
    polling,
    session.accessToken,
    subscriptionRequired,
    t,
  ]);

  const loading =
    session.loading ||
    !session.initialized ||
    (Boolean(session.accessToken) &&
      (status === 'idle' || status === 'loading'));

  return (
    <AppShell
      title={t('choose_lesson')}
      subtitle={t('build_streak')}
      withoutBack
    >
      {loading ? (
        <RoundedCard>
          <p className={styles.textReset}>{t('loading')}</p>
        </RoundedCard>
      ) : session.error ? (
        <RoundedCard>
          <p className={styles.textReset}>{session.error}</p>
        </RoundedCard>
      ) : (
        <div className="stack">
          <RoundedCard>
            <div className={`row ${styles.headerRow}`}>
              <strong>
                {currentLesson ? t('current_lesson') : t('next_step')}
              </strong>
              <span className="muted">
                {polling.state === 'pending' ||
                currentLesson?.status === 'generating'
                  ? t('generation_pending')
                  : t('ready')}
              </span>
            </div>
            {currentLesson?.status === 'in_progress' ? (
              <div className="column">
                <div>
                  <p className={styles.textReset}>
                    <strong>
                      {t('lesson')} {currentLesson.blockIndex + 1}
                    </strong>
                  </p>
                  <p className={`muted ${styles.description}`}>
                    {currentLesson.description ?? ''}
                  </p>
                </div>

                <Link href={`/lesson/${currentLesson.id}`}>
                  <PrimaryButton>{t('continue')}</PrimaryButton>
                </Link>
              </div>
            ) : currentLesson?.status === 'generating' ? (
              <div className={styles.generateBlock}>
                <p className={styles.textReset}>
                  <strong>{t('lesson_generating_title')}</strong>
                </p>
                <p className={`muted ${styles.description}`}>
                  {t('lesson_generating_subtitle')}
                </p>
                <p className={`muted ${styles.description}`}>
                  {t('lesson_generating_wait')}
                </p>
                <PrimaryButton disabled>
                  {t('generation_pending')}
                </PrimaryButton>
              </div>
            ) : (
              <div className={styles.generateBlock}>
                <p className={styles.textReset}>{t('generate_first_lesson')}</p>
                <PrimaryButton
                  disabled={polling.state === 'pending' || subscriptionRequired}
                  onClick={() => void onGenerate()}
                >
                  {polling.state === 'pending'
                    ? t('generating')
                    : t('generate')}
                </PrimaryButton>
              </div>
            )}
          </RoundedCard>

          {error || pageError ? (
            <RoundedCard>
              <p className={styles.errorText}>{pageError || error}</p>
            </RoundedCard>
          ) : null}

          {subscriptionRequired ? (
            <RoundedCard>
              <div className={styles.generateBlock}>
                <strong>{t('subscription_required_title')}</strong>
                <p className={`muted ${styles.textReset}`}>
                  {t('subscription_required_subtitle')}
                </p>
                <Link href="/subscription">
                  <PrimaryButton>
                    {t('subscription_go_to_paywall')}
                  </PrimaryButton>
                </Link>
              </div>
            </RoundedCard>
          ) : null}
        </div>
      )}
    </AppShell>
  );
};
