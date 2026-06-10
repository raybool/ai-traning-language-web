'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { useModal } from '@/components/providers/ModalProvider/hooks';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import {
  type SubscriptionPaymentMethod,
  createPaymentMethodBindCheckout,
  deleteSubscriptionPaymentMethod,
  getSubscriptionPaymentMethods,
  setDefaultSubscriptionPaymentMethod,
} from '@/src/lib/api';
import { openTelegramExternalLink } from '@/src/lib/telegram';
import { useAppDispatch } from '@/src/store/hooks';
import { refreshSubscriptionThunk } from '@/src/store/slices/appBootstrapSlice';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { FC, useCallback, useEffect, useRef, useState } from 'react';

import styles from './PaymentWidget.module.scss';
import type { TPaymentWidgetProps } from './types';

function formatPaymentMethodLabel(method: SubscriptionPaymentMethod): string {
  if (method.title) {
    return method.title;
  }
  const brand = method.brand?.trim() || 'Bank card';
  return method.last4 ? `${brand} •••• ${method.last4}` : brand;
}

export const PaymentWidget: FC<TPaymentWidgetProps> = ({ setError }) => {
  const router = useRouter();
  const { t } = useI18n();
  const modal = useModal();
  const dispatch = useAppDispatch();

  const { session } = useAppBootstrap();

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<
    SubscriptionPaymentMethod[]
  >([]);
  const loadKeyRef = useRef('');

  const refreshPaymentMethods = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const nextPaymentMethods = await getSubscriptionPaymentMethods(token);
        setPaymentMethods(nextPaymentMethods);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth_failed'));
      } finally {
        setLoading(false);
      }
    },
    [setError, t]
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
    void refreshPaymentMethods(session.accessToken);
  }, [
    refreshPaymentMethods,
    session.accessToken,
    session.error,
    session.loading,
  ]);

  const onBindPaymentMethod = useCallback(async () => {
    if (!session.accessToken || busyAction) {
      return;
    }

    setBusyAction('bind-payment-method');
    setError('');

    try {
      const checkout = await createPaymentMethodBindCheckout(
        session.accessToken
      );
      if (checkout.confirmationUrl) {
        openTelegramExternalLink(checkout.confirmationUrl);
      }
      router.push(
        `/subscription/result?paymentId=${encodeURIComponent(checkout.paymentId)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth_failed'));
    } finally {
      setBusyAction('');
    }
  }, [busyAction, router, session.accessToken, t]);

  const refreshSubscriptionAndMethods = useCallback(async () => {
    if (!session.accessToken) {
      return;
    }
    await Promise.all([
      dispatch(refreshSubscriptionThunk()).unwrap(),
      refreshPaymentMethods(session.accessToken),
    ]);
  }, [dispatch, refreshPaymentMethods, session.accessToken]);

  const refreshMethodsOnly = useCallback(async () => {
    if (!session.accessToken) {
      return;
    }
    await refreshPaymentMethods(session.accessToken);
  }, [refreshPaymentMethods, session.accessToken]);

  const onSetDefaultPaymentMethod = useCallback(
    async (paymentMethodId: number) => {
      if (!session.accessToken || busyAction) {
        return;
      }

      setBusyAction(`set-default-${paymentMethodId}`);
      setError('');
      try {
        await setDefaultSubscriptionPaymentMethod(
          paymentMethodId,
          session.accessToken
        );
        await refreshSubscriptionAndMethods();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth_failed'));
      } finally {
        setBusyAction('');
      }
    },
    [busyAction, refreshSubscriptionAndMethods, session.accessToken, t]
  );

  const onDeletePaymentMethod = useCallback(
    (paymentMethod: SubscriptionPaymentMethod) => {
      if (!session.accessToken || busyAction) {
        return;
      }

      modal.open({
        title: paymentMethod.isDefault
          ? t('subscription_payment_method_delete_main_title')
          : t('subscription_payment_method_delete_additional_title'),
        content: paymentMethod.isDefault
          ? t('subscription_payment_method_delete_main_body')
          : t('subscription_payment_method_delete_additional_body'),
        okText: paymentMethod.isDefault
          ? t('subscription_payment_method_delete_main')
          : t('subscription_payment_method_delete_additional'),
        cancelText: t('back'),
        danger: true,
        onOk: async () => {
          setBusyAction(`delete-payment-method-${paymentMethod.id}`);
          setError('');
          try {
            const result = await deleteSubscriptionPaymentMethod(
              paymentMethod.id,
              session.accessToken
            );
            if (result.deletedKind === 'default' && result.autoRenewDisabled) {
              await refreshSubscriptionAndMethods();
            } else {
              await refreshMethodsOnly();
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : t('auth_failed'));
            throw err;
          } finally {
            setBusyAction('');
          }
        },
      });
    },
    [
      busyAction,
      modal,
      refreshMethodsOnly,
      refreshSubscriptionAndMethods,
      session.accessToken,
      t,
    ]
  );

  const onClickDeletePaymentMethod = (isDefault: boolean, id: number) => {
    if (busyAction === `set-default-${id}` || isDefault) return;

    void onSetDefaultPaymentMethod(id);
  };

  if (paymentMethods.length === 0) return null;

  return (
    <RoundedCard>
      <div className={styles.blockHeader}>
        <div>
          <strong>{t('subscription_payment_methods_title')}</strong>
          <p className={`muted ${styles.blockSubtitle}`}>
            {t('subscription_payment_methods_subtitle')}
          </p>
        </div>
      </div>

      <p className={`muted ${styles.bindNote}`}>
        {t('subscription_payment_method_bind_note')}
      </p>

      {loading ? (
        <p className={`muted ${styles.textBlock}`}>{t('loading')}</p>
      ) : paymentMethods.length === 0 ? (
        <p className={`muted ${styles.textBlock}`}>
          {t('subscription_payment_methods_empty')}
        </p>
      ) : (
        <div className={styles.paymentMethodsList}>
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={cn(styles.paymentMethodItem, {
                [styles.currentPaymentMethod]: method.isDefault,
              })}
              onClick={() =>
                onClickDeletePaymentMethod(method.isDefault, method.id)
              }
            >
              {busyAction === `set-default-${method.id}` && (
                <div className={styles.loaderBlock}>
                  <LoadingOutlined style={{ fontSize: 23 }} />
                </div>
              )}

              <div className={styles.paymentMethodTopRow}>
                <div className={styles.paymentMethodInfo}>
                  <div className={styles.paymentMethodTitleRow}>
                    <strong>{formatPaymentMethodLabel(method)}</strong>

                    {method.isDefault ? (
                      <span className={styles.defaultBadge}>
                        {t('subscription_payment_method_default')}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.deletePaymentMethodButton}
                  disabled={Boolean(busyAction)}
                  aria-label={
                    method.isDefault
                      ? t('subscription_payment_method_delete_main')
                      : t('subscription_payment_method_delete_additional')
                  }
                  title={
                    method.isDefault
                      ? t('subscription_payment_method_delete_main')
                      : t('subscription_payment_method_delete_additional')
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePaymentMethod(method);
                  }}
                >
                  {busyAction === `delete-payment-method-${method.id}`
                    ? '…'
                    : '×'}
                </button>
              </div>
            </div>
          ))}

          <Button
            className={styles.plusBlock}
            disabled={Boolean(busyAction)}
            loading={busyAction === 'bind-payment-method'}
            onClick={() => void onBindPaymentMethod()}
          >
            {busyAction !== 'bind-payment-method' && (
              <Flex justify="center" align="center" gap={4}>
                <PlusOutlined style={{ fontSize: 23 }} />

                <p>{t('subscription_payment_method_add')}</p>
              </Flex>
            )}
          </Button>
        </div>
      )}
    </RoundedCard>
  );
};
