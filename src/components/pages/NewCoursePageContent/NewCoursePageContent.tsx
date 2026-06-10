'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { useModal } from '@/components/providers/ModalProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { RoundedButton } from '@/components/ui/RoundedButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import {
  ApiError,
  CourseTemplate,
  createCourseFromTemplate,
  getAllCourses,
  getCourseTemplates,
} from '@/lib/api';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import { useAppDispatch } from '@/src/store/hooks';
import { loadAppBootstrapThunk } from '@/src/store/slices/appBootstrapSlice';
import { Badge } from 'antd';
import cn from 'classnames';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react';

import styles from './NewCoursePageContent.module.scss';

export const NewCoursePageContent: FC = () => {
  const { t } = useI18n();
  const { session, status, subscription } = useAppBootstrap();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const modal = useModal();
  const loadKeyRef = useRef<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [creatingTemplateId, setCreatingTemplateId] = useState<number | null>(
    null
  );

  const refresh = useCallback(
    async (accessToken: string) => {
      setLoading(true);
      setError('');
      try {
        const allCourses = await getAllCourses(accessToken);
        const blocked =
          subscription !== null &&
          subscription.status !== 'active' &&
          allCourses.length >= 1;
        if (blocked) {
          router.replace('/subscription');
          return;
        }

        const allTemplates = await getCourseTemplates(accessToken);
        setTemplates(allTemplates);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth_failed'));
      } finally {
        setLoading(false);
      }
    },
    [router, subscription, t]
  );

  useEffect(() => {
    if (
      !session.loading &&
      !session.error &&
      status !== 'idle' &&
      status !== 'loading' &&
      session.accessToken
    ) {
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
    status,
  ]);

  const onCreateFromTemplate = useCallback(
    async (templateId: number) => {
      if (!session.accessToken) return;
      setCreatingTemplateId(templateId);
      setError('');
      try {
        await createCourseFromTemplate({ templateId }, session.accessToken);
        await dispatch(loadAppBootstrapThunk({ force: true })).unwrap();
        router.replace('/lessons');
      } catch (e) {
        if (e instanceof ApiError && e.status === 402) {
          setCreatingTemplateId(null);
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
          return;
        }
        setError(e instanceof Error ? e.message : t('auth_failed'));
        setCreatingTemplateId(null);
      }
    },
    [dispatch, modal, router, session.accessToken, t]
  );

  return (
    <AppShell
      title={t('courses_new_title')}
      subtitle={t('courses_new_subtitle')}
    >
      {loading || session.loading ? (
        <RoundedCard>
          <p className={styles.textReset}>{t('loading')}</p>
        </RoundedCard>
      ) : session.error ? (
        <RoundedCard>
          <p className={styles.textReset}>{session.error}</p>
        </RoundedCard>
      ) : (
        <div className="stack">
          {!!error && (
            <RoundedCard>
              <p className={styles.errorText}>{error}</p>
            </RoundedCard>
          )}

          {!templates.length ? (
            <EmptyState title={t('no_templates')} subtitle={t('loading')} />
          ) : (
            <div className="stack">
              {templates.map(({ id, title, level, durationWeeks }) => (
                <RoundedButton
                  key={id}
                  className={styles.courseBlock}
                  onClick={() => void onCreateFromTemplate(id)}
                  disabled={creatingTemplateId === id}
                  loading={creatingTemplateId === id}
                >
                  <div className={cn('row', styles.templateRow)}>
                    <strong>{title}</strong>

                    <Badge>{level}</Badge>
                  </div>

                  <p className={cn('muted', styles.mutedText)}>
                    {t('template_level')}: {level}
                  </p>

                  <p className={cn('muted', styles.mutedText)}>
                    {t('template_duration_weeks')}: {durationWeeks}
                  </p>
                </RoundedButton>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};
