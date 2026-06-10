'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useI18n } from '../components/providers/I18nProvider';
import { AppShell } from '../components/ui/AppShell';
import { useSession } from '../hooks/useSession';
import { getCurrentUser } from '../lib/api';

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const session = useSession();
  const redirectKeyRef = useRef('');

  useEffect(() => {
    const run = async () => {
      if (
        session.loading ||
        !session.initialized ||
        session.error ||
        !session.accessToken
      ) {
        return;
      }

      const nextKey = `${session.telegramId ?? 'anon'}:${session.accessToken}`;
      if (redirectKeyRef.current === nextKey) {
        return;
      }
      redirectKeyRef.current = nextKey;

      try {
        const user = await getCurrentUser(session.accessToken);
        if (!user.onboardingCompletedAt && !user.currentCourseId) {
          router.replace('/onboarding');
          return;
        }
        if (user.onboardingCompletedAt && !user.wowLessonCompletedAt) {
          router.replace('/welcome/practice');
          return;
        }
        router.replace('/home');
      } catch {
        router.replace('/home');
      }
    };

    void run();
  }, [
    router,
    session.accessToken,
    session.error,
    session.initialized,
    session.loading,
    session.telegramId,
  ]);

  return (
    <AppShell
      title={process.env.NEXT_PUBLIC_WEBAPP_NAME || 'WebApp'}
      subtitle={t('prepare_space')}
      withoutBack
    >
      {(session.loading || !session.initialized) && <p>{t('loading')}</p>}
      {!!session.error && <p>{session.error}</p>}
    </AppShell>
  );
}
