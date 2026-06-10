'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { StatTile } from '@/components/ui/StatTile';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import Link from 'next/link';
import { FC, useMemo } from 'react';

import styles from './HomePageContent.module.scss';

export const HomePageContent: FC = () => {
  const { t } = useI18n();
  const {
    session,
    status,
    error,
    currentCourseId,
    lessons,
    currentLesson,
    progressSummary,
    progressError,
    subscriptionRequired,
  } = useAppBootstrap();

  const avgProgress = useMemo(() => {
    if (!lessons.length) return 0;
    return Math.round(
      lessons.reduce((acc, x) => acc + x.progress, 0) / lessons.length
    );
  }, [lessons]);

  const weeklyBars = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
    });

    const source =
      progressSummary?.last7Days ??
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return {
          date: date.toISOString().slice(0, 10),
          completedItems: 0,
          percent: 0,
        };
      });

    return source.map((day) => ({
      day: formatter.format(new Date(`${day.date}T12:00:00`)),
      value: day.percent,
      completedItems: day.completedItems,
    }));
  }, [progressSummary]);

  const loading =
    session.loading ||
    !session.initialized ||
    (Boolean(session.accessToken) &&
      (status === 'idle' || status === 'loading'));
  const lessonHref = !currentCourseId
    ? '/courses'
    : currentLesson && currentLesson.status !== 'generating'
      ? `/lesson/${currentLesson.id}`
      : '/lessons';
  const heroTitle =
    currentLesson?.status === 'generating'
      ? t('lesson_generating_title')
      : currentLesson
        ? `${t('lesson')} ${currentLesson.blockIndex + 1}`
        : currentCourseId
          ? t('ready_next_lesson')
          : t('choose_first_course_title');
  const heroButtonLabel = !currentCourseId
    ? t('go_to_courses')
    : currentLesson?.status === 'generating'
      ? t('open_lessons')
      : currentLesson
        ? t('quick_start')
        : t('open_lessons');

  return (
    <AppShell
      title={t('daily_practice')}
      subtitle={t('small_steps')}
      withoutBack
    >
      {loading ? (
        <RoundedCard>
          <p className={styles.loadingText}>{t('loading')}</p>
        </RoundedCard>
      ) : session.error ? (
        <RoundedCard>
          <p className={styles.loadingText}>{session.error}</p>
        </RoundedCard>
      ) : error ? (
        <RoundedCard>
          <p className={styles.loadingText}>{error}</p>
        </RoundedCard>
      ) : (
        <div className="stack">
          {progressError ? (
            <RoundedCard>
              <p className={styles.loadingText}>
                {progressError || t('progress_unavailable')}
              </p>
            </RoundedCard>
          ) : null}

          {subscriptionRequired ? (
            <RoundedCard>
              <strong>{t('subscription_required_title')}</strong>
              <p className={`muted ${styles.loadingText}`}>
                {t('subscription_required_subtitle')}
              </p>
              <Link href="/subscription">
                <PrimaryButton>{t('subscription_go_to_paywall')}</PrimaryButton>
              </Link>
            </RoundedCard>
          ) : null}

          <RoundedCard className={styles.heroCard}>
            <p className={styles.heroLabel}>{t('today_lesson')}</p>
            <h2 className={styles.heroTitle}>{heroTitle}</h2>
            <div className={styles.heroProgress}>
              <ProgressBar value={currentLesson?.progress ?? avgProgress} />
            </div>
            <div className="row">
              <span>
                {t('progress')} {currentLesson?.progress ?? avgProgress}%
              </span>
              <Link href={lessonHref}>
                <PrimaryButton>{heroButtonLabel}</PrimaryButton>
              </Link>
            </div>
          </RoundedCard>

          <div className={styles.statsGrid}>
            <StatTile
              label={t('today_progress')}
              value={
                progressSummary
                  ? `${progressSummary.completedItemsToday}/${progressSummary.dailyTarget}`
                  : '0/10'
              }
            />
            <StatTile
              label={t('daily_goal')}
              value={`${progressSummary?.dailyPercent ?? 0}%`}
            />
            <StatTile
              label={t('streak')}
              value={`${progressSummary?.streakDays ?? 0} ${t('days')}`}
            />
          </div>

          <RoundedCard>
            <div className={`row ${styles.weeklyHeader}`}>
              <strong>{t('weekly_progress')}</strong>
              <span className="muted">
                {t('items_done_today')}{' '}
                {progressSummary?.completedItemsToday ?? 0}
              </span>
            </div>
            <div className={styles.barsGrid}>
              {weeklyBars.map((bar) => (
                <div key={bar.day} className={styles.barItem}>
                  <div
                    className={styles.barFill}
                    style={{ ['--bar-height' as string]: `${bar.value}%` }}
                  />
                  <div className={`muted ${styles.barLabel}`}>{bar.day}</div>
                </div>
              ))}
            </div>
          </RoundedCard>

          {lessons.length > 0 && (
            <RoundedCard>
              <p className={styles.loadingText}>{t('motivator')}</p>
            </RoundedCard>
          )}
        </div>
      )}
    </AppShell>
  );
};
