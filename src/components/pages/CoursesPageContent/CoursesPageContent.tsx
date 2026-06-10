'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { useModal } from '@/components/providers/ModalProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RoundedButton } from '@/components/ui/RoundedButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { Course, getAllCourses, setCurrentCourse } from '@/lib/api';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import { useAppDispatch } from '@/src/store/hooks';
import { loadAppBootstrapThunk } from '@/src/store/slices/appBootstrapSlice';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useRouter } from 'next/navigation';
import { FC, useCallback, useEffect, useRef, useState } from 'react';

import styles from './CoursesPageContent.module.scss';

export const CoursesPageContent: FC = () => {
  const { t } = useI18n();
  const router = useRouter();
  const loadKeyRef = useRef<string>('');
  const createdSeenRef = useRef(false);
  const modal = useModal();
  const dispatch = useAppDispatch();
  const { session, status, currentCourseId, subscription } = useAppBootstrap();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [switchingCourseId, setSwitchingCourseId] = useState<number | null>(
    null
  );

  const isCourseCreationBlocked =
    subscription !== null &&
    subscription.status !== 'active' &&
    courses.length >= 1;

  const openModal = () =>
    modal.open({
      title: t('subscription_required_title'),
      content: t('subscription_required_subtitle'),
      okText: t('subscription_go_to_paywall'),
      cancelText: t('back_to_courses'),
      onOk: () => {
        router.push('/subscription');
      },
      onCancel: () => {
        router.push('/courses');
      },
      mask: { closable: true },
    });

  const refresh = useCallback(
    async (accessToken: string) => {
      setLoading(true);
      setError('');
      try {
        setCourses(await getAllCourses(accessToken));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth_failed'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!session.loading && !session.error && session.accessToken) {
      const nextKey = `${session.telegramId ?? 'anon'}:${session.accessToken}`;
      if (loadKeyRef.current !== nextKey) {
        loadKeyRef.current = nextKey;
        void refresh(session.accessToken);
      }
    }
  }, [
    session.loading,
    session.error,
    session.telegramId,
    session.accessToken,
    refresh,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('created') === '1' && !createdSeenRef.current) {
      createdSeenRef.current = true;
      setMessage(t('course_created'));
    }
    if (params.get('generationFailed') === '1') {
      setError(t('course_generation_failed_removed'));
    }
  }, [t]);

  const onClickAddCourse = useCallback(() => {
    if (isCourseCreationBlocked) {
      openModal();
      return;
    }
    router.push('/courses/new');
  }, [isCourseCreationBlocked, openModal, router]);

  const onSelectCourse = useCallback(
    async (courseId: number) => {
      if (!session.accessToken) return;
      setSwitchingCourseId(courseId);
      setMessage('');
      setError('');
      try {
        await setCurrentCourse(courseId, session.accessToken);
        await dispatch(loadAppBootstrapThunk({ force: true })).unwrap();
        setMessage(t('course_switched'));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth_failed'));
      } finally {
        setSwitchingCourseId(null);
      }
    },
    [dispatch, session.accessToken, t]
  );

  const pageLoading =
    session.loading ||
    loading ||
    !session.initialized ||
    (Boolean(session.accessToken) &&
      (status === 'idle' || status === 'loading'));

  return (
    <AppShell
      title={t('courses_title')}
      subtitle={t('courses_subtitle')}
      withoutBack
      actions={
        <Button
          onClick={onClickAddCourse}
          variant="filled"
          color="default"
          aria-label={t('add_course')}
        >
          <PlusOutlined />
        </Button>
      }
    >
      {pageLoading ? (
        <RoundedCard>
          <p className={styles.textReset}>{t('loading')}</p>
        </RoundedCard>
      ) : session.error ? (
        <RoundedCard>
          <p className={styles.textReset}>{session.error}</p>
        </RoundedCard>
      ) : (
        <div className="stack">
          {!!message && (
            <RoundedCard>
              <p className={styles.successText}>{message}</p>
            </RoundedCard>
          )}
          {!!error && (
            <RoundedCard>
              <p className={styles.errorText}>{error}</p>
            </RoundedCard>
          )}

          {!courses.length ? (
            <EmptyState
              title={t('no_courses')}
              subtitle={t('generate_first_lesson')}
            />
          ) : (
            <div className="stack">
              {courses.map(({ id, title, progress }) => {
                const selected = currentCourseId === id;
                return (
                  <RoundedButton
                    key={id}
                    className={styles.courseCard}
                    onClick={() => void onSelectCourse(id)}
                    disabled={switchingCourseId === id}
                    loading={switchingCourseId === id}
                  >
                    <div className={styles.nameBlock}>
                      <strong>{title}</strong>

                      {selected ? (
                        <Badge tone="success">{t('selected_course')}</Badge>
                      ) : null}
                    </div>

                    <p className={`muted ${styles.progressText}`}>
                      {t('progress')}: {progress}%
                    </p>
                  </RoundedButton>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};
