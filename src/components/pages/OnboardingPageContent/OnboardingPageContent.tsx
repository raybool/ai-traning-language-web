'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { useSession } from '@/src/hooks/useSession';
import { completeOnboarding, getCurrentUser } from '@/src/lib/api';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useRef, useState } from 'react';

import styles from './OnboardingPageContent.module.scss';
import {
  ONBOARDING_DAILY_MINUTES_OPTIONS,
  ONBOARDING_FOCUS_OPTIONS,
  ONBOARDING_GOAL_OPTIONS,
  ONBOARDING_LEVEL_OPTIONS,
  ONBOARDING_STEPS,
} from './constants';
import type {
  TOnboardingDailyMinutes,
  TOnboardingFocus,
  TOnboardingGoal,
  TOnboardingLevel,
} from './types';

export const OnboardingPageContent: FC = () => {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const userLoadRef = useRef('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<TOnboardingGoal | null>(null);
  const [level, setLevel] = useState<TOnboardingLevel | null>(null);
  const [dailyMinutes, setDailyMinutes] =
    useState<TOnboardingDailyMinutes | null>(null);
  const [focusSkill, setFocusSkill] = useState<TOnboardingFocus | null>(null);

  useEffect(() => {
    const run = async () => {
      if (session.loading || session.error || !session.accessToken) {
        return;
      }

      const nextKey = `${session.telegramId ?? 'anon'}:${session.accessToken}`;
      if (userLoadRef.current === nextKey) {
        return;
      }
      userLoadRef.current = nextKey;

      setLoading(true);
      setError('');

      try {
        const user = await getCurrentUser(session.accessToken);
        if (!user.onboardingCompletedAt && !user.currentCourseId) {
          setGoal((user.goal as TOnboardingGoal | null | undefined) ?? null);
          setLevel((user.level as TOnboardingLevel | null | undefined) ?? null);
          setDailyMinutes(
            (user.dailyMinutes as TOnboardingDailyMinutes | null | undefined) ??
              null
          );
          setFocusSkill(
            (user.focusSkill as TOnboardingFocus | null | undefined) ?? null
          );
          return;
        }

        if (user.onboardingCompletedAt && !user.wowLessonCompletedAt) {
          router.replace('/welcome/practice');
          return;
        }

        router.replace('/home');
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t('auth_failed')
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [
    router,
    session.accessToken,
    session.error,
    session.loading,
    session.telegramId,
    t,
  ]);

  const canContinue =
    (step === 0 && Boolean(goal)) ||
    (step === 1 && Boolean(level)) ||
    (step === 2 && Boolean(dailyMinutes)) ||
    (step === 3 && Boolean(focusSkill));

  const onNext = async () => {
    if (!canContinue) {
      return;
    }

    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }

    if (
      !goal ||
      !level ||
      !dailyMinutes ||
      !focusSkill ||
      !session.accessToken
    ) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await completeOnboarding(
        {
          goal,
          level,
          dailyMinutes,
          focusSkill,
        },
        session.accessToken
      );
      router.replace(response.nextPath);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={t('onboarding_title')}
      subtitle={t('onboarding_subtitle')}
      withoutBack
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
          <RoundedCard>
            <div className={styles.progressRow}>
              {ONBOARDING_STEPS.map((index) => (
                <span
                  key={index}
                  className={`${styles.progressDot}${index <= step ? ` ${styles.progressDotActive}` : ''}`}
                />
              ))}
            </div>

            {step === 0 ? (
              <div className={styles.optionBlock}>
                <strong>{t('onboarding_goal_title')}</strong>
                <div className={styles.optionsGrid}>
                  {ONBOARDING_GOAL_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.optionCard}${goal === option ? ` ${styles.optionCardActive}` : ''}`}
                      onClick={() => setGoal(option)}
                    >
                      {t(`onboarding_goal_${option}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.optionBlock}>
                <strong>{t('onboarding_level_title')}</strong>
                <div className={styles.optionsGrid}>
                  {ONBOARDING_LEVEL_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.optionCard}${level === option ? ` ${styles.optionCardActive}` : ''}`}
                      onClick={() => setLevel(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.optionBlock}>
                <strong>{t('onboarding_daily_minutes_title')}</strong>
                <div className={styles.optionsGrid}>
                  {ONBOARDING_DAILY_MINUTES_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.optionCard}${dailyMinutes === option ? ` ${styles.optionCardActive}` : ''}`}
                      onClick={() => setDailyMinutes(option)}
                    >
                      {option} {t('onboarding_minutes_suffix')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.optionBlock}>
                <strong>{t('onboarding_focus_title')}</strong>
                <div className={styles.optionsGrid}>
                  {ONBOARDING_FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.optionCard}${focusSkill === option ? ` ${styles.optionCardActive}` : ''}`}
                      onClick={() => setFocusSkill(option)}
                    >
                      {t(`onboarding_focus_${option}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </RoundedCard>

          {error ? (
            <RoundedCard>
              <p className={styles.errorText}>{error}</p>
            </RoundedCard>
          ) : null}

          <div className={styles.actionsRow}>
            <PrimaryButton
              htmlType="button"
              styleType="ghost"
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              disabled={step === 0 || submitting}
            >
              {t('onboarding_back')}
            </PrimaryButton>
            <PrimaryButton
              htmlType="button"
              onClick={() => void onNext()}
              disabled={!canContinue || submitting}
              loading={submitting}
            >
              {step === 3 ? t('onboarding_start') : t('onboarding_continue')}
            </PrimaryButton>
          </div>
        </div>
      )}
    </AppShell>
  );
};
