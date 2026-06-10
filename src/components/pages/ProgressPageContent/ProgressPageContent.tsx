'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { StatTile } from '@/components/ui/StatTile';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import { useAppDispatch } from '@/src/store/hooks';
import { refreshCourseProgressThunk } from '@/src/store/slices/appBootstrapSlice';
import { FC, useEffect } from 'react';

import styles from './ProgressPageContent.module.scss';
import { SkillMasteryMap } from './components/SkillMasteryMap';
import { SKILL_COLORS } from './constants';

export const ProgressPageContent: FC = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const {
    session,
    status,
    error,
    currentCourseId,
    courseProgressSummary,
    courseProgressError,
  } = useAppBootstrap();

  useEffect(() => {
    if (
      !session.loading &&
      !session.error &&
      session.accessToken &&
      currentCourseId
    ) {
      void dispatch(refreshCourseProgressThunk());
    }
  }, [
    currentCourseId,
    dispatch,
    session.accessToken,
    session.error,
    session.loading,
  ]);

  const loading =
    session.loading ||
    !session.initialized ||
    (Boolean(session.accessToken) &&
      (status === 'idle' || status === 'loading'));
  const courseProgressLoading =
    Boolean(currentCourseId) && !courseProgressSummary && !courseProgressError;

  const skillValues = (courseProgressSummary?.skillMastery ?? []).map(
    (entry) => ({
      label: t(`progress_skill_${entry.key}`),
      value: entry.value,
      color: SKILL_COLORS[entry.key],
    })
  );

  const achievements = (courseProgressSummary?.achievements ?? []).map(
    (achievement) => ({
      ...achievement,
      title: t(`progress_achievement_${achievement.key}`),
    })
  );

  return (
    <AppShell
      title={t('progress_title')}
      subtitle={t('track_growth')}
      withoutBack
    >
      <div className="stack">
        {loading ? (
          <RoundedCard>
            <p className={styles.textReset}>{t('loading')}</p>
          </RoundedCard>
        ) : session.error ? (
          <RoundedCard>
            <p className={styles.textReset}>{session.error}</p>
          </RoundedCard>
        ) : !session.error && error ? (
          <RoundedCard>
            <p className={styles.textReset}>{error}</p>
          </RoundedCard>
        ) : !currentCourseId ? (
          <EmptyState
            title={t('progress_no_course_title')}
            subtitle={t('progress_no_course_subtitle')}
          />
        ) : courseProgressLoading ? (
          <RoundedCard>
            <p className={styles.textReset}>{t('loading')}</p>
          </RoundedCard>
        ) : courseProgressError ? (
          <RoundedCard>
            <p className={styles.textReset}>{courseProgressError}</p>
          </RoundedCard>
        ) : !courseProgressSummary || courseProgressSummary.totalItems === 0 ? (
          <EmptyState
            title={t('progress_empty_course_title')}
            subtitle={t('progress_empty_course_subtitle')}
          />
        ) : (
          <>
            <div className={styles.statsGrid}>
              <StatTile label="XP" value={courseProgressSummary.xp} />
              <StatTile
                label={t('level')}
                value={courseProgressSummary.level}
              />
              <StatTile
                label={t('streak')}
                value={`${courseProgressSummary.streakDays} ${t('days')}`}
              />
            </div>

            <RoundedCard>
              <div className={`row ${styles.headerRow}`}>
                <strong>{t('level_progression')}</strong>
                <span className="muted">
                  {courseProgressSummary.levelXpCurrent}/
                  {courseProgressSummary.levelXpTarget} XP
                </span>
              </div>
              <ProgressBar value={courseProgressSummary.levelProgressPercent} />
            </RoundedCard>

            <div className={styles.statsGrid}>
              <StatTile
                label={t('progress_known_items')}
                value={courseProgressSummary.knownItems}
              />
              <StatTile
                label={t('progress_learning_items')}
                value={courseProgressSummary.learningItems}
              />
              <StatTile
                label={t('progress_completed_lessons')}
                value={`${courseProgressSummary.completedLessons}/${courseProgressSummary.totalLessons}`}
              />
            </div>

            <RoundedCard>
              <strong>{t('skill_mastery')}</strong>
              <div className={styles.mapWrap}>
                <SkillMasteryMap values={skillValues} />
              </div>
            </RoundedCard>

            <RoundedCard>
              <strong>{t('achievements')}</strong>
              <div className={styles.achievementsGrid}>
                {achievements.map((achievement) => (
                  <div
                    key={achievement.key}
                    className={styles.achievement}
                    data-unlocked={achievement.unlocked}
                  >
                    <strong>{achievement.title}</strong>
                    <div className={`muted ${styles.achievementProgress}`}>
                      {achievement.progressCurrent}/{achievement.progressTarget}
                    </div>
                  </div>
                ))}
              </div>
            </RoundedCard>
          </>
        )}
      </div>
    </AppShell>
  );
};
