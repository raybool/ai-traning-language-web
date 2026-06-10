'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { SubscriptionInfoBlock } from '@/components/subscription/SubscriptionInfoBlock';
import { AppShell } from '@/components/ui/AppShell';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import { getCurrentUser } from '@/src/lib/api';
import { FC, useEffect, useRef, useState } from 'react';

import styles from './ProfilePageContent.module.scss';

export const ProfilePageContent: FC = () => {
  const { t } = useI18n();
  const { session, status, subscription } = useAppBootstrap();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Learner');
  const [level, setLevel] = useState('A1');
  const [goal, setGoal] = useState('-');
  const [focus, setFocus] = useState('-');
  const [dailyMinutes, setDailyMinutes] = useState('-');
  const [onboardingDone, setOnboardingDone] = useState(false);
  const loadKeyRef = useRef<string>('');

  const resolveGoalLabel = (value: string) => {
    if (
      value === 'work' ||
      value === 'travel' ||
      value === 'interviews' ||
      value === 'from_scratch'
    ) {
      return t(`onboarding_goal_${value}`);
    }

    return '-';
  };

  const resolveFocusLabel = (value: string) => {
    if (
      value === 'speaking' ||
      value === 'vocabulary' ||
      value === 'grammar' ||
      value === 'listening'
    ) {
      return t(`onboarding_focus_${value}`);
    }

    return '-';
  };

  useEffect(() => {
    const run = async () => {
      if (session.loading || session.error || !session.accessToken) {
        return;
      }
      const nextKey = `${session.telegramId ?? 'anon'}:${session.accessToken}`;
      if (loadKeyRef.current === nextKey) return;
      loadKeyRef.current = nextKey;
      setLoading(true);
      try {
        const user = await getCurrentUser(session.accessToken);
        setName(user.firstName || user.username || 'Learner');
        setLevel((user.level || user.languageCode || 'A1').toUpperCase());
        setGoal(user.goal ? resolveGoalLabel(user.goal) : '-');
        setFocus(user.focusSkill ? resolveFocusLabel(user.focusSkill) : '-');
        setDailyMinutes(
          user.dailyMinutes
            ? `${user.dailyMinutes} ${t('onboarding_minutes_suffix')}`
            : '-'
        );
        setOnboardingDone(Boolean(user.onboardingCompletedAt));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [
    session.accessToken,
    session.error,
    session.loading,
    session.telegramId,
    t,
  ]);

  const pageLoading =
    session.loading ||
    loading ||
    !session.initialized ||
    (Boolean(session.accessToken) &&
      (status === 'idle' || status === 'loading'));

  return (
    <AppShell title={t('profile')} subtitle={t('identity_goals')} withoutBack>
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
          <RoundedCard>
            <h3 className={styles.name}>{name}</h3>
            <p className={`muted ${styles.textReset}`}>{level}</p>
            <div className={styles.metaList}>
              <p className={styles.metaRow}>
                <span className="muted">{t('profile_goal')}</span>
                <strong>{goal}</strong>
              </p>
              <p className={styles.metaRow}>
                <span className="muted">{t('profile_focus')}</span>
                <strong>{focus}</strong>
              </p>
              <p className={styles.metaRow}>
                <span className="muted">{t('profile_daily_minutes')}</span>
                <strong>{dailyMinutes}</strong>
              </p>
              <p className={styles.metaRow}>
                <span className="muted">{t('profile_onboarding_done')}</span>
                <strong>{onboardingDone ? t('yes') : t('no')}</strong>
              </p>
            </div>
          </RoundedCard>

          <SubscriptionInfoBlock subscription={subscription} />
        </div>
      )}
    </AppShell>
  );
};
