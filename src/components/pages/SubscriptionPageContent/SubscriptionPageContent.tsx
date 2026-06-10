'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { useModal } from '@/components/providers/ModalProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaymentWidget } from '@/components/ui/PaymentWidget';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import {
  type SubscriptionPlan,
  cancelSubscription,
  createSubscriptionCheckout,
  getSubscriptionPlans,
  setAutoRenew,
} from '@/src/lib/api';
import { openTelegramExternalLink } from '@/src/lib/telegram';
import { useAppDispatch } from '@/src/store/hooks';
import { refreshSubscriptionThunk } from '@/src/store/slices/appBootstrapSlice';
import { useRouter } from 'next/navigation';
import { FC, useCallback, useEffect, useRef, useState } from 'react';

import styles from './SubscriptionPageContent.module.scss';
import { STATUS_LABEL_KEY } from './constants';
import { formatDate } from './utils/formatDate';
import { formatPlanDescription } from './utils/formatPlanDescription';
import { isFeaturedPlan } from './utils/isFeaturedPlan';

export const SubscriptionPageContent: FC = () => {
  const router = useRouter();
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const modal = useModal();
  const { session, subscription, subscriptionError } = useAppBootstrap();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const [checkoutPlanCode, setCheckoutPlanCode] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const loadKeyRef = useRef('');

  const refreshPlans = useCallback(
    async (token: string) => {
      setLoading(true);
      setError('');

      try {
        const availablePlans = await getSubscriptionPlans(token);
        setPlans(availablePlans);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth_failed'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (session.loading || session.error || !session.accessToken) {
      return;
    }

    const nextKey = session.accessToken;
    if (loadKeyRef.current === nextKey) {
      return;
    }

    loadKeyRef.current = nextKey;
    void refreshPlans(session.accessToken);
  }, [session.loading, session.error, session.accessToken, refreshPlans]);

  const onCheckout = useCallback(
    async (planCode: string) => {
      if (!session.accessToken || checkoutPlanCode) {
        return;
      }

      setCheckoutPlanCode(planCode);
      setError('');

      try {
        const checkout = await createSubscriptionCheckout(
          planCode,
          session.accessToken
        );
        if (checkout.status === 'succeeded') {
          await dispatch(refreshSubscriptionThunk()).unwrap();
        }

        if (checkout.confirmationUrl) {
          openTelegramExternalLink(checkout.confirmationUrl);
        }

        router.push(
          `/subscription/result?paymentId=${encodeURIComponent(checkout.paymentId)}`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth_failed'));
      } finally {
        setCheckoutPlanCode('');
      }
    },
    [checkoutPlanCode, dispatch, router, session.accessToken, t]
  );

  const refreshSubscriptionAndMethods = useCallback(async () => {
    if (!session.accessToken) return;

    await dispatch(refreshSubscriptionThunk()).unwrap();
  }, [dispatch, session.accessToken]);

  const onCancelSubscription = useCallback(() => {
    if (!session.accessToken || busyAction) {
      return;
    }

    modal.open({
      title: t('subscription_cancel_title'),
      content: t('subscription_cancel_body'),
      okText: t('subscription_cancel_confirm'),
      cancelText: t('back'),
      danger: true,
      onOk: async () => {
        setBusyAction('cancel-subscription');
        setError('');
        try {
          await cancelSubscription(session.accessToken);
          await refreshSubscriptionAndMethods();
        } catch (err) {
          setError(err instanceof Error ? err.message : t('auth_failed'));
          throw err;
        } finally {
          setBusyAction('');
        }
      },
    });
  }, [
    busyAction,
    modal,
    refreshSubscriptionAndMethods,
    session.accessToken,
    t,
  ]);

  const onResumeSubscription = useCallback(async () => {
    if (!session.accessToken || busyAction) {
      return;
    }

    setBusyAction('resume-subscription');
    setError('');
    try {
      await setAutoRenew(true, session.accessToken);
      await refreshSubscriptionAndMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth_failed'));
    } finally {
      setBusyAction('');
    }
  }, [busyAction, refreshSubscriptionAndMethods, session.accessToken, t]);

  const resolvedError = session.error || error || subscriptionError;
  const hasActiveSubscription = subscription?.status === 'active';
  const pageLoading =
    session.loading ||
    loading ||
    !session.initialized ||
    (Boolean(session.accessToken) && !subscription && !resolvedError);

  const isActive =
    subscription?.status === 'active' || subscription?.status === 'expired';

  return (
    <AppShell
      title={t('subscription_title')}
      subtitle={t('subscription_subtitle')}
    >
      {pageLoading ? (
        <RoundedCard>
          <p className={styles.textReset}>{t('loading')}</p>
        </RoundedCard>
      ) : resolvedError ? (
        <RoundedCard>
          <p className={styles.errorText}>{resolvedError}</p>
        </RoundedCard>
      ) : !subscription ? (
        <RoundedCard>
          <EmptyState
            title={t('subscription_title')}
            subtitle={t('no_lessons_yet')}
          />
        </RoundedCard>
      ) : (
        <div className="stack">
          <RoundedCard>
            <div className={styles.rowBetween}>
              <strong>{t('subscription_status')}</strong>
              <span className={styles.statusPill}>
                {t(STATUS_LABEL_KEY[subscription.status])}
              </span>
            </div>

            {isActive && (
              <>
                <p className={`muted ${styles.textBlock}`}>
                  {t('subscription_current_plan')}: {subscription.title}
                </p>

                <p className={`muted ${styles.textBlock}`}>
                  {t('subscription_expires_at')}:{' '}
                  {formatDate(subscription.expiresAt).split(',')[0]}
                </p>

                <p className={`muted ${styles.textBlock}`}>
                  {t('subscription_auto_renew')}:{' '}
                  {subscription.autoRenew
                    ? t('subscription_auto_renew_enabled')
                    : t('subscription_auto_renew_disabled')}
                </p>
              </>
            )}

            {!hasActiveSubscription ? (
              <>
                <p className={`muted ${styles.textBlock}`}>
                  {t('subscription_free_limit')}:{' '}
                  {subscription.freeGenerationsUsed}/
                  {subscription.freeGenerationsLimit}
                </p>

                {subscription.hasSavedPaymentMethod && (
                  <p className={`muted ${styles.textBlock}`}>
                    {t('subscription_saved_payment_method')}:{' '}
                    {t('subscription_saved_payment_method_ready')}
                  </p>
                )}
              </>
            ) : null}
          </RoundedCard>

          {subscription.canManagePaymentMethods ? (
            <PaymentWidget setError={setError} />
          ) : null}

          {!hasActiveSubscription && plans.length === 0 ? (
            <RoundedCard>
              <EmptyState
                title={t('subscription_title')}
                subtitle={t('subscription_no_plans')}
              />
            </RoundedCard>
          ) : !hasActiveSubscription ? (
            plans.map((plan) => (
              <RoundedCard
                key={plan.id}
                className={
                  isFeaturedPlan(plan) ? styles.featuredCard : undefined
                }
              >
                {(() => {
                  const description = formatPlanDescription(plan.description);
                  const featured = isFeaturedPlan(plan);

                  return (
                    <>
                      {featured ? (
                        <div className={styles.featuredBadgeRow}>
                          <span className={styles.featuredBadge}>
                            Рекомендуем
                          </span>
                          <span className={styles.featuredNote}>
                            Самый выгодный тариф
                          </span>
                        </div>
                      ) : null}

                      <div className={styles.rowBetween}>
                        <strong
                          className={
                            featured ? styles.featuredTitle : undefined
                          }
                        >
                          {plan.title}
                        </strong>
                        <span
                          className={featured ? styles.featuredPrice : 'muted'}
                        >
                          {plan.price} {plan.currency}
                        </span>
                      </div>

                      {description.intro ? (
                        <p className={styles.planIntro}>{description.intro}</p>
                      ) : null}

                      {description.extras.length > 0 ? (
                        <div className={styles.planExtrasBlock}>
                          <p className={styles.planExtrasLabel}>
                            {description.extrasLabel ?? 'Дополнительно:'}
                          </p>
                          <ul className={styles.planExtrasList}>
                            {description.extras.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className={styles.actionRow}>
                        <PrimaryButton
                          disabled={Boolean(checkoutPlanCode)}
                          loading={checkoutPlanCode === plan.code}
                          onClick={() => void onCheckout(plan.code)}
                        >
                          {t('subscription_buy_now')}
                        </PrimaryButton>
                      </div>
                    </>
                  );
                })()}
              </RoundedCard>
            ))
          ) : null}

          {hasActiveSubscription && subscription.autoRenew ? (
            <div className={styles.cancelSubscriptionWrap}>
              <PrimaryButton
                danger
                className={styles.cancelSubscriptionButton}
                disabled={Boolean(busyAction)}
                loading={busyAction === 'cancel-subscription'}
                onClick={onCancelSubscription}
              >
                {t('subscription_cancel')}
              </PrimaryButton>
            </div>
          ) : hasActiveSubscription ? (
            <div className={styles.cancelSubscriptionWrap}>
              <PrimaryButton
                className={styles.resumeSubscriptionButton}
                disabled={Boolean(busyAction)}
                loading={busyAction === 'resume-subscription'}
                onClick={() => void onResumeSubscription()}
              >
                {t('subscription_resume')}
              </PrimaryButton>
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
};
