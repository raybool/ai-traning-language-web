'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useSearchParams } from 'next/navigation';
import { FC, useMemo } from 'react';

import styles from './BlockedPageContent.module.scss';
import { formatBlockedUntil } from './utils/formatBlockedUntil';

export const BlockedPageContent: FC = () => {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const blockedUntilRaw = searchParams.get('blockedUntil');
  const supportText =
    searchParams.get('support') || t('blocked_support_default');
  const supportUrl = searchParams.get('supportUrl');

  const blockedUntil = useMemo(
    () => formatBlockedUntil(blockedUntilRaw),
    [blockedUntilRaw]
  );

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('blocked_title')}</h1>
        <p className={styles.text}>{t('blocked_subtitle')}</p>

        {blockedUntil ? (
          <p className={styles.text}>
            <strong>{t('blocked_until_label')}:</strong> {blockedUntil}
          </p>
        ) : null}

        <p className={styles.text}>{supportText}</p>

        {supportUrl ? (
          <PrimaryButton
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.link}
          >
            {t('blocked_support_button')}
          </PrimaryButton>
        ) : null}
      </div>
    </main>
  );
};
