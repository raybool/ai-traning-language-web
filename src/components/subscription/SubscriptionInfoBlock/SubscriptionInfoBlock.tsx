import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { RoundedButton } from '@/components/ui/RoundedButton';
import { RightOutlined } from '@ant-design/icons';
import { FC } from 'react';

import styles from './SubscriptionInfoBlock.module.scss';
import { TSubscriptionInfoBlockProps } from './types';

export const SubscriptionInfoBlock: FC<TSubscriptionInfoBlockProps> = ({
  subscription,
}) => {
  const { t } = useI18n();

  return (
    <RoundedButton href="/subscription" size="large" className={styles.button}>
      <div className={styles.textBlock}>
        <strong>{t('subscription_title')}</strong>
        <p className={styles.placeholder}>
          {t('subscription_status')}:{' '}
          {subscription
            ? t(
                subscription.status === 'active'
                  ? 'subscription_active'
                  : subscription.status === 'expired'
                    ? 'subscription_expired'
                    : 'subscription_free'
              )
            : '—'}
        </p>
      </div>

      <RightOutlined />
    </RoundedButton>
  );
};
