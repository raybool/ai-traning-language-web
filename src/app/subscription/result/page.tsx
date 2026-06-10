'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { AppShell } from '../../../components/ui/AppShell';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { RoundedCard } from '../../../components/ui/RoundedCard';
import { useAppBootstrap } from '../../../hooks/useAppBootstrap';
import {
  type SubscriptionPaymentStatus,
  getSubscriptionPaymentStatus,
} from '../../../lib/api';
import type { MessageKey } from '../../../lib/i18n';
import { useAppDispatch } from '../../../store/hooks';
import { refreshSubscriptionThunk } from '../../../store/slices/appBootstrapSlice';
import styles from './styles.module.scss';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;

const STATUS_LABEL_KEY = {
  pending: 'subscription_payment_pending',
  waiting_for_capture: 'subscription_payment_waiting',
  succeeded: 'subscription_payment_succeeded',
  canceled: 'subscription_payment_canceled',
  card_saved_refund_pending: 'subscription_payment_card_saved_refund_pending',
  card_saved_refund_succeeded:
    'subscription_payment_card_saved_refund_succeeded',
  card_saved_refund_failed: 'subscription_payment_card_saved_refund_failed',
} as const;

function getStatusNote(
  payment: SubscriptionPaymentStatus,
  t: (key: MessageKey) => string
): string {
  if (payment.purpose === 'bind_payment_method') {
    if (payment.status === 'card_saved_refund_succeeded') {
      return t('subscription_payment_card_binding_ready');
    }
    if (payment.status === 'card_saved_refund_pending') {
      return t('subscription_payment_card_binding_waiting');
    }
    if (payment.status === 'card_saved_refund_failed') {
      return t('subscription_payment_card_binding_failed');
    }
  }

  return payment.subscriptionActivated
    ? t('subscription_payment_activated')
    : t('subscription_payment_waiting_note');
}

export default function SubscriptionPaymentResultPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <AppShell
          title={t('subscription_payment_title')}
          subtitle={t('subscription_payment_subtitle')}
        >
          <RoundedCard>
            <p className={styles.textReset}>{t('loading')}</p>
          </RoundedCard>
        </AppShell>
      }
    >
      <SubscriptionPaymentResultContent />
    </Suspense>
  );
}

function SubscriptionPaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId') ?? '';
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { session } = useAppBootstrap();
  const [payment, setPayment] = useState<SubscriptionPaymentStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const pollAttemptRef = useRef(0);
  const refreshedRef = useRef(false);
  const resolvedError = session.error || error;

  const loadPayment = useCallback(
    async (showSpinner: boolean) => {
      if (!paymentId || !session.accessToken) {
        return;
      }

      if (showSpinner) {
        setLoading(true);
      } else {
        setPolling(true);
      }
      setError('');

      try {
        const result = await getSubscriptionPaymentStatus(
          paymentId,
          session.accessToken
        );
        setPayment(result);
        if (
          result.status === 'succeeded' &&
          result.subscriptionActivated &&
          !refreshedRef.current
        ) {
          refreshedRef.current = true;
          await dispatch(refreshSubscriptionThunk()).unwrap();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth_failed'));
      } finally {
        setLoading(false);
        setPolling(false);
      }
    },
    [dispatch, paymentId, session.accessToken, t]
  );

  useEffect(() => {
    if (session.loading || session.error || !session.accessToken) {
      return;
    }

    if (!paymentId) {
      setLoading(false);
      setError(t('subscription_payment_missing'));
      return;
    }

    pollAttemptRef.current = 0;
    refreshedRef.current = false;
    void loadPayment(true);
  }, [
    loadPayment,
    paymentId,
    session.accessToken,
    session.error,
    session.loading,
    t,
  ]);

  useEffect(() => {
    if (!payment) {
      return;
    }

    if (
      payment.status !== 'pending' &&
      payment.status !== 'waiting_for_capture' &&
      payment.status !== 'card_saved_refund_pending'
    ) {
      return;
    }

    if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
      return;
    }

    const timer = window.setTimeout(() => {
      pollAttemptRef.current += 1;
      void loadPayment(false);
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [loadPayment, payment]);

  return (
    <AppShell
      title={t('subscription_payment_title')}
      subtitle={t('subscription_payment_subtitle')}
    >
      <RoundedCard>
        {session.loading || loading ? (
          <p className={styles.textReset}>{t('loading')}</p>
        ) : resolvedError ? (
          <p className={styles.errorText}>{resolvedError}</p>
        ) : !payment ? (
          <p className={styles.textReset}>
            {t('subscription_payment_missing')}
          </p>
        ) : (
          <div className="stack">
            <div className={styles.rowBetween}>
              <strong>{t('subscription_payment_status')}</strong>
              <span className={styles.statusPill}>
                {t(STATUS_LABEL_KEY[payment.status])}
              </span>
            </div>

            <p className={`muted ${styles.textBlock}`}>
              {payment.planCode
                ? `${t('subscription_current_plan')}: ${payment.planCode}`
                : t('subscription_payment_status')}
            </p>
            <p className={`muted ${styles.textBlock}`}>
              {getStatusNote(payment, t)}
            </p>
            {polling ? (
              <p className={`muted ${styles.textBlock}`}>
                {t('subscription_payment_checking')}
              </p>
            ) : null}

            <div className={styles.actions}>
              <PrimaryButton onClick={() => void loadPayment(false)}>
                {t('subscription_payment_refresh')}
              </PrimaryButton>
              <PrimaryButton
                styleType="ghost"
                onClick={() => router.push('/subscription')}
              >
                {t('subscription_go_to_paywall')}
              </PrimaryButton>
            </div>
          </div>
        )}
      </RoundedCard>
    </AppShell>
  );
}
