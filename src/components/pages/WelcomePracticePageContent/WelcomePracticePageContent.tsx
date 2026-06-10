'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { useSession } from '@/src/hooks/useSession';
import {
  ApiError,
  type DialogueChatMessage,
  type DialogueChatSession,
  type OnboardingLesson,
  completeOnboardingLesson,
  createCourseFromOnboarding,
  createDialogueChatSession,
  getCurrentOnboardingLesson,
  getCurrentUser,
  getDialogueChatMessages,
  sendDialogueChatMessage,
} from '@/src/lib/api';
import { useAppDispatch } from '@/src/store/hooks';
import { loadAppBootstrapThunk } from '@/src/store/slices/appBootstrapSlice';
import { useRouter } from 'next/navigation';
import { FC, type FormEvent, useEffect, useRef, useState } from 'react';

import styles from './WelcomePracticePageContent.module.scss';

function createLocalId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export const WelcomePracticePageContent: FC = () => {
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const session = useSession();
  const loadKeyRef = useRef('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<OnboardingLesson | null>(null);
  const [chatSession, setChatSession] = useState<DialogueChatSession | null>(
    null
  );
  const [chatMessages, setChatMessages] = useState<DialogueChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [wordsDone, setWordsDone] = useState(false);
  const [ruleDone, setRuleDone] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [dailyUsed, setDailyUsed] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (session.loading || session.error || !session.accessToken) {
        return;
      }

      const nextKey = `${session.telegramId ?? 'anon'}:${session.accessToken}`;
      if (loadKeyRef.current === nextKey) {
        return;
      }
      loadKeyRef.current = nextKey;

      setLoading(true);
      setError('');

      try {
        const user = await getCurrentUser(session.accessToken);
        if (!user.onboardingCompletedAt && !user.currentCourseId) {
          router.replace('/onboarding');
          return;
        }
        if (user.wowLessonCompletedAt) {
          router.replace('/home');
          return;
        }

        const onboardingLesson = await getCurrentOnboardingLesson(
          session.accessToken
        );
        const createdSession = await createDialogueChatSession(
          { onboardingLessonKey: onboardingLesson.key },
          session.accessToken
        );
        const history = await getDialogueChatMessages(
          createdSession.sessionId,
          session.accessToken
        );

        setLesson(onboardingLesson);
        setChatSession(createdSession);
        setChatMessages(
          history.messages.filter((message) => message.role !== 'system')
        );
        setDailyLimit(createdSession.dailyLimit);
        setDailyUsed(createdSession.dailyUsed);
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

  const userReplyCount = chatMessages.filter(
    (message) => message.role === 'user'
  ).length;
  const canFinish = Boolean(
    lesson && wordsDone && ruleDone && userReplyCount > 0
  );
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

  const onSend = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !chatSession || !session.accessToken || sending) {
      return;
    }

    setError('');
    setSending(true);
    setInput('');

    const localUserMessage: DialogueChatMessage = {
      id: `local-user-${createLocalId()}`,
      role: 'user',
      text: trimmed,
      meta: null,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, localUserMessage]);

    try {
      const response = await sendDialogueChatMessage(
        chatSession.sessionId,
        trimmed,
        session.accessToken
      );
      const assistantMessage: DialogueChatMessage = {
        id: `local-assistant-${createLocalId()}`,
        role: 'assistant',
        text: response.assistant.text,
        meta: {
          feedback: response.assistant.feedback,
        },
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      setDailyLimit(response.dailyLimit);
      setDailyUsed(response.dailyUsed);
    } catch (requestError) {
      setChatMessages((prev) =>
        prev.filter((message) => message.id !== localUserMessage.id)
      );
      if (requestError instanceof ApiError && requestError.status === 429) {
        setError(t('premium_chat_limit_reached'));
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t('auth_failed')
        );
      }
    } finally {
      setSending(false);
    }
  };

  const onComplete = async () => {
    if (!lesson || !session.accessToken || !canFinish) {
      return;
    }

    setCompleting(true);
    setError('');
    try {
      await completeOnboardingLesson(lesson.key, session.accessToken);
      setCompleted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    } finally {
      setCompleting(false);
    }
  };

  const onCreateCourse = async () => {
    if (!session.accessToken) {
      return;
    }

    setCreatingCourse(true);
    setError('');
    try {
      await createCourseFromOnboarding(session.accessToken);
      await dispatch(loadAppBootstrapThunk({ force: true })).unwrap();
      router.push('/lessons');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  return (
    <AppShell
      title={t('welcome_practice_title')}
      subtitle={t('welcome_practice_subtitle')}
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
      ) : completed && lesson ? (
        <div className="stack">
          <RoundedCard className={styles.victoryCard}>
            <strong>{t('welcome_victory_title')}</strong>
            <p className={`muted ${styles.textReset}`}>
              {t('welcome_victory_subtitle')}
            </p>
            <div className={styles.victoryStats}>
              <div className={styles.victoryStat}>
                <span className={styles.victoryLabel}>
                  {t('welcome_streak_label')}
                </span>
                <strong>1 day</strong>
              </div>
              <div className={styles.victoryStat}>
                <span className={styles.victoryLabel}>
                  {t('welcome_next_step_label')}
                </span>
                <strong>{lesson.nextStep}</strong>
              </div>
            </div>
          </RoundedCard>

          <RoundedCard className={styles.paywallCard}>
            <strong>{t('welcome_soft_paywall_title')}</strong>
            <p className={`muted ${styles.textReset}`}>
              {t('welcome_soft_paywall_body')}
            </p>
            <div className={styles.actionsColumn}>
              <PrimaryButton
                htmlType="button"
                onClick={() => void onCreateCourse()}
                loading={creatingCourse}
                disabled={creatingCourse}
              >
                {creatingCourse
                  ? t('welcome_course_creating')
                  : t('welcome_create_course')}
              </PrimaryButton>
              <PrimaryButton
                htmlType="button"
                styleType="ghost"
                onClick={() => router.push('/home')}
              >
                {t('welcome_continue_free')}
              </PrimaryButton>
            </div>
          </RoundedCard>

          {error ? (
            <RoundedCard>
              <p className={styles.errorText}>{error}</p>
            </RoundedCard>
          ) : null}
        </div>
      ) : lesson ? (
        <div className="stack">
          <RoundedCard>
            <div className={styles.sectionHeader}>
              <strong>{t('welcome_words_title')}</strong>
              <span className="muted">1/3</span>
            </div>
            <div className={styles.wordGrid}>
              {lesson.words.map((word) => (
                <div key={word.term} className={styles.wordCard}>
                  <strong>{word.term}</strong>
                  <p className={`muted ${styles.textReset}`}>
                    {word.translate}
                  </p>
                  <p className={styles.exampleText}>{word.example}</p>
                </div>
              ))}
            </div>
            <PrimaryButton
              htmlType="button"
              styleType="ghost"
              onClick={() => setWordsDone(true)}
            >
              {t('welcome_words_done')}
            </PrimaryButton>
          </RoundedCard>

          <RoundedCard>
            <div className={styles.sectionHeader}>
              <strong>{t('welcome_rule_title')}</strong>
              <span className="muted">2/3</span>
            </div>
            <strong>{lesson.rule.title}</strong>
            <p className={`muted ${styles.textReset}`}>
              {lesson.rule.explanation}
            </p>
            <p className={styles.exampleText}>{lesson.rule.example}</p>
            <PrimaryButton
              htmlType="button"
              styleType="ghost"
              onClick={() => setRuleDone(true)}
            >
              {t('welcome_rule_done')}
            </PrimaryButton>
          </RoundedCard>

          <RoundedCard>
            <div className={styles.sectionHeader}>
              <strong>{t('welcome_dialogue_title')}</strong>
              <span className="muted">3/3</span>
            </div>
            <p className={`muted ${styles.textReset}`}>
              {lesson.dialogue.scenario}
            </p>
            <p className={styles.textReset}>
              <strong>{t('welcome_dialogue_goal')}:</strong>{' '}
              {lesson.dialogue.goal}
            </p>
            <p className={styles.textReset}>
              <strong>{t('welcome_suggested_reply')}:</strong>{' '}
              {lesson.dialogue.suggestedReply}
            </p>
            <div className={styles.counterRow}>
              <span className="muted">
                {t('premium_chat_remaining')}: {dailyRemaining}/{dailyLimit}
              </span>
            </div>

            <div className="stack">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? styles.chatRowStudent
                      : styles.chatRowAssistant
                  }
                >
                  <div
                    className={`${styles.bubble} ${
                      message.role === 'user'
                        ? styles.bubbleStudent
                        : styles.bubbleAssistant
                    }`}
                  >
                    <p className={styles.textReset}>{message.text}</p>
                    {message.role === 'assistant' &&
                    message.meta &&
                    typeof message.meta.feedback === 'string' ? (
                      <p className={`muted ${styles.feedback}`}>
                        {t('premium_chat_feedback')}:{' '}
                        {String(message.meta.feedback)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}

              {sending ? (
                <div className={styles.chatRowAssistant}>
                  <div
                    className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typingBubble}`}
                    aria-live="polite"
                    aria-label="AI is typing"
                  >
                    <span className={styles.typingDots}>
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <form onSubmit={onSend} className={styles.form}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t('dialogue_input_placeholder')}
                rows={3}
                className={styles.textarea}
                disabled={sending || dailyRemaining <= 0}
              />
              <div className={styles.actionsColumn}>
                <PrimaryButton
                  htmlType="submit"
                  loading={sending}
                  disabled={sending || dailyRemaining <= 0}
                >
                  {t('send')}
                </PrimaryButton>
                <PrimaryButton
                  htmlType="button"
                  onClick={() => void onComplete()}
                  disabled={!canFinish || completing}
                  loading={completing}
                >
                  {t('welcome_finish')}
                </PrimaryButton>
              </div>
            </form>
          </RoundedCard>

          {error ? (
            <RoundedCard>
              <p className={styles.errorText}>{error}</p>
            </RoundedCard>
          ) : null}
        </div>
      ) : (
        <RoundedCard>
          <p className={styles.textReset}>{t('loading')}</p>
        </RoundedCard>
      )}
    </AppShell>
  );
};
