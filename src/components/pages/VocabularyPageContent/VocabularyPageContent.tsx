'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { Badge } from '@/components/ui/Badge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { getLessonSectionItems, updateLessonItemStatus } from '@/lib/api';
import { useSession } from '@/src/hooks/useSession';
import cn from 'classnames';
import { FC, useEffect, useMemo, useRef, useState } from 'react';

import styles from './VocabularyPageContent.module.scss';
import { cardStyleByStatus } from './constants';
import type { TVocabularyPageContentProps, VocabularyCard } from './types';

export const VocabularyPageContent: FC<TVocabularyPageContentProps> = ({
  lessonId,
}) => {
  const { t } = useI18n();
  const session = useSession();
  const [index, setIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [cards, setCards] = useState<VocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const touchStart = useRef<number | null>(null);
  const loadKeyRef = useRef('');
  const current = cards[index];

  useEffect(() => {
    if (session.loading || session.error || !session.accessToken) return;

    const nextKey = `${lessonId}:${session.telegramId ?? 'anon'}:${session.accessToken}`;
    if (loadKeyRef.current === nextKey) return;
    loadKeyRef.current = nextKey;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const items = await getLessonSectionItems(
          lessonId,
          'words',
          session.accessToken!
        );

        setCards(
          items.map((item) => ({
            id: item.id,
            status: item.status,
            word: item.title,
            translate: item.translate ?? '',
            example:
              typeof item.content?.example === 'string'
                ? item.content.example
                : '',
          }))
        );
        setIndex(0);
        setShowTranslation(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth_failed'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [
    lessonId,
    session.accessToken,
    session.error,
    session.loading,
    session.telegramId,
    t,
  ]);

  const progress = useMemo(
    () => Math.round(((index + 1) / cards.length) * 100),
    [index]
  );
  const knownCount = useMemo(
    () => cards.filter((card) => card.status === 'known').length,
    [cards]
  );

  const next = () => {
    setShowTranslation(false);
    setIndex((prev) => (prev + 1 >= cards.length ? 0 : prev + 1));
  };

  const prev = () => {
    setShowTranslation(false);
    setIndex((v) => (v === 0 ? cards.length - 1 : v - 1));
  };

  const pronounce = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(current.word);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const onKnow = async () => {
    if (!current) return;
    setError('');

    if (current.id > 0 && lessonId && session.accessToken) {
      try {
        await updateLessonItemStatus(
          lessonId,
          current.id,
          'known',
          session.accessToken
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth_failed'));
        return;
      }
    }

    setCards((prev) =>
      prev.map((card) =>
        card.id === current.id ? { ...card, status: 'known' } : card
      )
    );
    next();
  };

  const handleToggleTranslation = async () => {
    const nextVisible = !showTranslation;
    setShowTranslation(nextVisible);
    if (!nextVisible) return;
    if (!current || current.status === 'known') return;
    if (!(current.id > 0 && lessonId && session.accessToken)) return;

    try {
      await updateLessonItemStatus(
        lessonId,
        current.id,
        'learning',
        session.accessToken
      );
      setCards((prev) =>
        prev.map((card) =>
          card.id === current.id ? { ...card, status: 'learning' } : card
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth_failed'));
    }
  };

  const cardStyle = cardStyleByStatus[current?.status ?? 'new'];

  return (
    <AppShell title={t('vocabulary')} subtitle={t('flashcards_sr')}>
      <div className="stack">
        {loading || session.loading ? (
          <RoundedCard>
            <p className={styles.textReset}>{t('loading')}</p>
          </RoundedCard>
        ) : null}
        {error ? (
          <RoundedCard>
            <p className={styles.errorText}>{error}</p>
          </RoundedCard>
        ) : null}
        <RoundedCard>
          <div className={cn('row', styles.headerRow)}>
            <strong>
              {t('card')} {index + 1}/{cards.length}
            </strong>
            <span className="muted">
              {t('spaced_repetition')} • {knownCount}/{cards.length}
            </span>
          </div>
          <ProgressBar value={progress} />
        </RoundedCard>

        <RoundedCard className={cn(styles.cardVisual, cardStyle.style)}>
          <div className={styles.statusWrap}>
            <Badge tone={cardStyle.tone}>{t(current?.status)}</Badge>
          </div>
          <div
            onTouchStart={(e) => {
              touchStart.current = e.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              if (start === null) return;
              const delta = (e.changedTouches[0]?.clientX ?? 0) - start;
              if (delta > 40) prev();
              if (delta < -40) next();
              touchStart.current = null;
            }}
          >
            <h2 className={styles.wordTitle}>{current?.word}</h2>
            <p className="muted">{current?.example}</p>
            {showTranslation ? (
              <p className={styles.translation}>{current?.translate}</p>
            ) : null}
          </div>
        </RoundedCard>

        <div className={cn('row', styles.actions)}>
          <PrimaryButton
            styleType="ghost"
            onClick={() => void handleToggleTranslation()}
          >
            {showTranslation ? t('hide_translation') : t('show_translation')}
          </PrimaryButton>

          <PrimaryButton onClick={() => void onKnow()}>
            {t('know_button')}
          </PrimaryButton>
        </div>

        <RoundedCard>
          <div className="row">
            <strong>{t('pronunciation')}</strong>

            <PrimaryButton styleType="ghost" onClick={pronounce}>
              {t('speak')}
            </PrimaryButton>
          </div>
        </RoundedCard>
      </div>
    </AppShell>
  );
};
