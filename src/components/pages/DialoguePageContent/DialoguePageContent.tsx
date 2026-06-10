'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoundedCard } from '@/components/ui/RoundedCard';
import {
  ApiError,
  createDialogueChatSession,
  getDialogueChatMessages,
  getLessonSectionItems,
  sendDialogueChatMessage,
  updateLessonItemStatus,
} from '@/lib/api';
import type {
  DialogueChatMessage,
  DialogueChatSession,
  LessonItem,
} from '@/lib/api';
import { useAppBootstrap } from '@/src/hooks/useAppBootstrap';
import { useSession } from '@/src/hooks/useSession';
import { FC, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import styles from './DialoguePageContent.module.scss';
import type {
  TDialogueItemStatus,
  TDialogueMode,
  TDialoguePageContentProps,
  TScriptTurn,
  TUiLine,
} from './types';
import {
  createLocalId,
  getItemText,
  overlapScore,
  parseScriptTurns,
} from './utils/script';

export const DialoguePageContent: FC<TDialoguePageContentProps> = ({
  lessonId,
}) => {
  const { t } = useI18n();
  const session = useSession();
  const { status: bootstrapStatus } = useAppBootstrap();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<LessonItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [mode, setMode] = useState<TDialogueMode>('script');
  const [input, setInput] = useState('');
  const [showHints, setShowHints] = useState(false);

  const [scriptLines, setScriptLines] = useState<TUiLine[]>([]);
  const [scriptTurns, setScriptTurns] = useState<TScriptTurn[]>([]);
  const [scriptCursor, setScriptCursor] = useState(0);
  const [scriptFallback, setScriptFallback] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSending, setAiSending] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSafetyNotice, setAiSafetyNotice] = useState('');
  const [aiModerationNotice, setAiModerationNotice] = useState('');
  const [aiSession, setAiSession] = useState<DialogueChatSession | null>(null);
  const [aiMessages, setAiMessages] = useState<DialogueChatMessage[]>([]);
  const [aiDailyLimit, setAiDailyLimit] = useState(50);
  const [aiDailyUsed, setAiDailyUsed] = useState(0);

  const markedLearningRef = useRef<Set<number>>(new Set());
  const loadKeyRef = useRef('');
  const aiLoadKeyRef = useRef('');

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const aiDailyRemaining = Math.max(0, aiDailyLimit - aiDailyUsed);

  const updateItemStatus = async (
    itemId: number,
    status: TDialogueItemStatus
  ) => {
    if (!Number.isFinite(lessonId) || !session.accessToken) {
      return;
    }

    await updateLessonItemStatus(lessonId, itemId, status, session.accessToken);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status } : item))
    );
  };

  const markLearningIfNeeded = async (item: LessonItem) => {
    if (item.status === 'known' || markedLearningRef.current.has(item.id)) {
      return;
    }

    await updateItemStatus(item.id, 'learning');
    markedLearningRef.current.add(item.id);
  };

  useEffect(() => {
    const run = async () => {
      if (!Number.isFinite(lessonId)) {
        setLoading(false);
        setError(t('no_dialogue_selected'));
        return;
      }
      if (session.loading || session.error || !session.accessToken) {
        return;
      }

      const nextKey = `${lessonId}:${session.telegramId ?? 'anon'}:${session.accessToken}`;
      if (loadKeyRef.current === nextKey) {
        return;
      }
      loadKeyRef.current = nextKey;

      setLoading(true);
      setError('');

      try {
        const data = await getLessonSectionItems(
          lessonId,
          'dialogues',
          session.accessToken
        );
        setItems(data);

        if (!data.length) {
          setSelectedItemId(null);
          return;
        }

        const requestedItemId = Number(
          new URLSearchParams(window.location.search).get('itemId')
        );
        const hasRequestedItem = data.some(
          (item) => item.id === requestedItemId
        );
        setSelectedItemId(hasRequestedItem ? requestedItemId : data[0].id);
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
  }, [lessonId, session.loading, session.error, session.accessToken, t]);

  useEffect(() => {
    if (!selectedItem) {
      setScriptLines([]);
      setScriptTurns([]);
      setScriptCursor(0);
      setScriptFallback(false);
      return;
    }

    setInput('');
    setShowHints(false);

    const turns = parseScriptTurns(getItemText(selectedItem));
    if (!turns.length) {
      setScriptFallback(true);
      setScriptTurns([]);
      setScriptCursor(0);
      setScriptLines([
        {
          role: 'assistant',
          text: getItemText(selectedItem),
          hint: selectedItem.translate ?? '',
        },
      ]);
      return;
    }

    setScriptFallback(false);
    setScriptTurns(turns);

    const introLines: TUiLine[] = [];
    let nextCursor = 0;
    while (nextCursor < turns.length && turns[nextCursor].speaker === 'A') {
      introLines.push({
        role: 'assistant',
        text: turns[nextCursor].text,
        hint: selectedItem.translate ?? '',
      });
      nextCursor += 1;
    }

    setScriptLines(introLines);
    setScriptCursor(nextCursor);
  }, [selectedItemId]);

  useEffect(() => {
    const run = async () => {
      if (mode !== 'ai' || !selectedItem || !session.accessToken) {
        return;
      }
      if (bootstrapStatus === 'idle' || bootstrapStatus === 'loading') {
        return;
      }

      const nextKey = `${lessonId}:${selectedItem.id}:${session.accessToken}`;
      if (aiLoadKeyRef.current === nextKey) {
        return;
      }
      aiLoadKeyRef.current = nextKey;

      setAiLoading(true);
      setAiError('');
      setAiSafetyNotice('');
      setAiModerationNotice('');
      setAiMessages([]);
      setAiSession(null);

      try {
        const createdSession = await createDialogueChatSession(
          {
            lessonId,
            itemId: selectedItem.id,
          },
          session.accessToken
        );
        const history = await getDialogueChatMessages(
          createdSession.sessionId,
          session.accessToken
        );

        setAiSession(createdSession);
        setAiMessages(
          history.messages.filter((message) => message.role !== 'system')
        );
        setAiDailyLimit(createdSession.dailyLimit);
        setAiDailyUsed(createdSession.dailyUsed);
      } catch (requestError) {
        setAiError(
          requestError instanceof Error
            ? requestError.message
            : t('auth_failed')
        );
      } finally {
        setAiLoading(false);
      }
    };

    void run();
  }, [
    bootstrapStatus,
    lessonId,
    mode,
    selectedItemId,
    selectedItem,
    session.accessToken,
    t,
  ]);

  const onSelectDialogue = (itemId: number) => {
    setSelectedItemId(itemId);
    aiLoadKeyRef.current = '';

    const url = new URL(window.location.href);
    url.searchParams.set('itemId', String(itemId));
    window.history.replaceState({}, '', url.toString());
  };

  const onToggleHints = async () => {
    const nextValue = !showHints;
    setShowHints(nextValue);

    if (!nextValue || !selectedItem || selectedItem.status === 'known') {
      return;
    }

    try {
      await markLearningIfNeeded(selectedItem);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const onKnow = async () => {
    if (!selectedItem || selectedItem.status === 'known') {
      return;
    }

    try {
      await updateItemStatus(selectedItem.id, 'known');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const onSendScript = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !selectedItem) {
      return;
    }

    setInput('');

    if (scriptFallback || !scriptTurns.length) {
      setScriptLines((prev) => [
        ...prev,
        { role: 'student', text: trimmed },
        {
          role: 'assistant',
          text: t('dialogue_reply_stub'),
          hint: selectedItem.translate ?? '',
        },
      ]);
      try {
        await markLearningIfNeeded(selectedItem);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t('auth_failed')
        );
      }
      return;
    }

    const expectedTurn = scriptTurns[scriptCursor];
    if (!expectedTurn || expectedTurn.speaker !== 'B') {
      setScriptLines((prev) => [
        ...prev,
        { role: 'student', text: trimmed },
        {
          role: 'assistant',
          text: t('dialogue_reply_stub'),
          hint: selectedItem.translate ?? '',
        },
      ]);
      return;
    }

    const nextLines: TUiLine[] = [{ role: 'student', text: trimmed }];

    const score = overlapScore(trimmed, expectedTurn.text);
    if (score < 0.35) {
      nextLines.push({
        role: 'assistant',
        text: `${t('dialogue_expected_hint')}: ${expectedTurn.text}`,
      });
    }

    let cursor = scriptCursor + 1;
    while (cursor < scriptTurns.length && scriptTurns[cursor].speaker === 'A') {
      nextLines.push({
        role: 'assistant',
        text: scriptTurns[cursor].text,
        hint: selectedItem.translate ?? '',
      });
      cursor += 1;
    }

    if (cursor >= scriptTurns.length) {
      nextLines.push({
        role: 'assistant',
        text: t('dialogue_script_completed'),
      });
    }

    setScriptCursor(cursor);
    setScriptLines((prev) => [...prev, ...nextLines]);

    try {
      await markLearningIfNeeded(selectedItem);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const onSendAi = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (
      !trimmed ||
      !selectedItem ||
      !aiSession ||
      !session.accessToken ||
      aiSending
    ) {
      return;
    }

    setAiError('');
    setAiSafetyNotice('');
    setAiModerationNotice('');
    setAiSending(true);
    setInput('');

    const localUserMessage: DialogueChatMessage = {
      id: `local-user-${createLocalId()}`,
      role: 'user',
      text: trimmed,
      meta: null,
      createdAt: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, localUserMessage]);

    try {
      await markLearningIfNeeded(selectedItem);

      const response = await sendDialogueChatMessage(
        aiSession.sessionId,
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

      setAiMessages((prev) => [...prev, assistantMessage]);
      setAiDailyLimit(response.dailyLimit);
      setAiDailyUsed(response.dailyUsed);
      if (response.safety?.sanitized) {
        setAiSafetyNotice(
          response.safety.notice || t('safety_sanitized_notice')
        );
      }
      if (response.moderation?.offTopic) {
        setAiModerationNotice(t('dialogue_offtopic_notice'));
      }
    } catch (requestError) {
      setAiMessages((prev) =>
        prev.filter((message) => message.id !== localUserMessage.id)
      );
      if (requestError instanceof ApiError) {
        if (requestError.status === 429) {
          setAiError(t('premium_chat_limit_reached'));
          return;
        }
      }
      setAiError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    } finally {
      setAiSending(false);
    }
  };

  return (
    <AppShell title={t('dialogue_practice')} subtitle={t('chat_style')}>
      <div className="stack">
        <RoundedCard>
          {loading || session.loading ? (
            <p className={styles.textReset}>{t('loading')}</p>
          ) : !items.length ? (
            <EmptyState
              title={t('no_dialogue_selected')}
              subtitle={t('section_empty')}
            />
          ) : (
            <div className={styles.dialoguesList}>
              <strong>{t('select_dialogue')}</strong>
              <div className={styles.dialogueChips}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.dialogueChip}${item.id === selectedItemId ? ` ${styles.dialogueChipActive}` : ''}`}
                    onClick={() => onSelectDialogue(item.id)}
                  >
                    <span className={styles.dialogueChipTitle}>
                      {item.title}
                    </span>
                    <Badge
                      tone={
                        item.status === 'known'
                          ? 'success'
                          : item.status === 'learning'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {t(item.status)}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </RoundedCard>

        {error ? (
          <RoundedCard>
            <p className={styles.errorText}>{error}</p>
          </RoundedCard>
        ) : null}

        {!loading && selectedItem ? (
          <RoundedCard>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.modeTab}${mode === 'script' ? ` ${styles.modeTabActive}` : ''}`}
                onClick={() => setMode('script')}
              >
                {t('dialogue_mode_script')}
              </button>
              <button
                type="button"
                className={`${styles.modeTab}${mode === 'ai' ? ` ${styles.modeTabActive}` : ''}`}
                onClick={() => setMode('ai')}
              >
                {t('dialogue_mode_ai')}
              </button>
            </div>

            {mode === 'script' ? (
              <div className="stack">
                {scriptFallback ? (
                  <p className={`muted ${styles.parseFallback}`}>
                    {t('dialogue_parse_fallback')}
                  </p>
                ) : null}

                {scriptLines.map((line, idx) => (
                  <div
                    key={`${line.role}-${idx}`}
                    className={
                      line.role === 'student'
                        ? styles.chatRowStudent
                        : styles.chatRowAssistant
                    }
                  >
                    <div
                      className={`${styles.bubble} ${line.role === 'student' ? styles.bubbleStudent : styles.bubbleAssistant}`}
                    >
                      <p className={styles.textReset}>{line.text}</p>
                      {showHints && line.hint ? (
                        <p className={`muted ${styles.hint}`}>{line.hint}</p>
                      ) : null}
                    </div>
                  </div>
                ))}

                <form onSubmit={onSendScript} className={styles.form}>
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={t('dialogue_input_placeholder')}
                    rows={3}
                    className={styles.textarea}
                  />

                  <div className={styles.formActions}>
                    <PrimaryButton htmlType="submit">{t('send')}</PrimaryButton>
                    <PrimaryButton
                      htmlType="button"
                      styleType="ghost"
                      onClick={() => void onToggleHints()}
                    >
                      {showHints
                        ? t('hide_translation')
                        : t('show_translation')}
                    </PrimaryButton>
                    <PrimaryButton
                      htmlType="button"
                      onClick={() => void onKnow()}
                    >
                      {t('know_button')}
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            ) : (
              <div className="stack">
                {aiLoading ? (
                  <p className={styles.textReset}>{t('loading')}</p>
                ) : null}

                {!aiLoading && aiSession ? (
                  <>
                    <div className={styles.counterRow}>
                      <span className="muted">
                        {t('premium_chat_remaining')}: {aiDailyRemaining}/
                        {aiDailyLimit}
                      </span>
                    </div>

                    {aiMessages.length === 0 ? (
                      <p className="muted">{t('premium_chat_title')}</p>
                    ) : (
                      aiMessages.map((message) => (
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
                      ))
                    )}

                    {aiSending ? (
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

                    {aiError ? (
                      <p className={styles.errorText}>{aiError}</p>
                    ) : null}
                    {aiSafetyNotice ? (
                      <p className={`muted ${styles.textReset}`}>
                        {aiSafetyNotice}
                      </p>
                    ) : null}
                    {aiModerationNotice ? (
                      <p className={`muted ${styles.textReset}`}>
                        {aiModerationNotice}
                      </p>
                    ) : null}

                    <form onSubmit={onSendAi} className={styles.form}>
                      <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={t('dialogue_input_placeholder')}
                        rows={3}
                        className={styles.textarea}
                        disabled={aiSending || aiDailyRemaining <= 0}
                      />
                      <div className={styles.formActions}>
                        <PrimaryButton
                          htmlType="submit"
                          loading={aiSending}
                          disabled={aiSending || aiDailyRemaining <= 0}
                        >
                          {t('send')}
                        </PrimaryButton>
                        <PrimaryButton
                          htmlType="button"
                          styleType="ghost"
                          onClick={() => void onKnow()}
                        >
                          {t('know_button')}
                        </PrimaryButton>
                      </div>
                    </form>
                  </>
                ) : null}
              </div>
            )}
          </RoundedCard>
        ) : null}
      </div>
    </AppShell>
  );
};
