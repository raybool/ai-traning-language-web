'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LessonSectionTabs } from '../../../components/lesson/LessonSectionTabs';
import { useI18n } from '../../../components/providers/I18nProvider';
import { AppShell } from '../../../components/ui/AppShell';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { RoundedCard } from '../../../components/ui/RoundedCard';
import { useLessonSections } from '../../../hooks/useLessonSections';
import { useSession } from '../../../hooks/useSession';
import { LessonListItem, getLessonById } from '../../../lib/api';
import styles from './styles.module.scss';

export default function LessonPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const lessonId = Number(params.id);
  const session = useSession();
  const section = useLessonSections();

  const [lesson, setLesson] = useState<LessonListItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!Number.isFinite(lessonId)) {
        setError('Invalid lesson id');
        setLoading(false);
        return;
      }
      if (
        session.loading ||
        session.error ||
        !session.accessToken
      )
        return;

      setLoading(true);
      setError('');
      try {
        const data = await getLessonById(lessonId, session.accessToken);
        setLesson(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth_failed'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [
    lessonId,
    session.loading,
    session.error,
    session.accessToken,
  ]);

  return (
    <AppShell title={t('lesson')} subtitle={t('practice_steps')}>
      <div className="stack">
        {loading || session.loading ? (
          <RoundedCard>
            <p className={styles.textReset}>{t('loading')}</p>
          </RoundedCard>
        ) : (
          <>
            <RoundedCard>
              <div className={`row ${styles.headerRow}`}>
                <strong>
                  {lesson
                    ? `${t('lesson')} ${lesson.blockIndex + 1}`
                    : t('lesson')}
                </strong>
              </div>
              <div className={styles.progressWrap}>
                <ProgressBar value={lesson?.progress ?? 0} />
              </div>
              <div className="row">
                <span className="muted">
                  {t('progress')} {lesson?.progress ?? 0}%
                </span>
              </div>
              {lesson?.description ? (
                <p className={`muted ${styles.description}`}>
                  {lesson.description}
                </p>
              ) : null}
            </RoundedCard>

            <LessonSectionTabs lessonId={lessonId} />

            {error ? (
              <RoundedCard>
                <p className={styles.errorText}>{error}</p>
              </RoundedCard>
            ) : (
              section.error && (
                <RoundedCard>
                  <p className={styles.errorText}>{section.error}</p>
                </RoundedCard>
              )
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
