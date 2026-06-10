'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../../../../components/providers/I18nProvider';
import { AppShell } from '../../../../components/ui/AppShell';
import { Badge } from '../../../../components/ui/Badge';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { PrimaryButton } from '../../../../components/ui/PrimaryButton';
import { ProgressBar } from '../../../../components/ui/ProgressBar';
import { RoundedCard } from '../../../../components/ui/RoundedCard';
import { useSession } from '../../../../hooks/useSession';
import {
  LessonItem,
  getLessonSectionItems,
  updateLessonItemStatus,
} from '../../../../lib/api';
import styles from './styles.module.scss';

type ListeningPhase = 'prelisten' | 'watch' | 'quiz' | 'summary';
type SubtitlesMode = 'off' | 'en';
type FeedbackType = 'success' | 'error' | null;
type PlaybackRate = 1 | 0.85 | 0.75;
type OptionQuestionType = 'single_choice' | 'heard_phrase' | 'fill_gap';

type ListeningKeyword = {
  word: string;
  translate: string;
};

type ListeningSegment = {
  id: string;
  speaker: 'A' | 'B';
  startSec: number;
  endSec: number;
  text: string;
  translate: string;
};

type OptionQuestion = {
  type: OptionQuestionType;
  question: string;
  options: string[];
  correctIndex: number;
  successFeedback: string;
  errorFeedback: string;
};

type OrderLinesQuestion = {
  type: 'order_lines';
  question: string;
  lines: string[];
  correctOrder: number[];
  successFeedback: string;
  errorFeedback: string;
};

type ListeningQuestion = OptionQuestion | OrderLinesQuestion;

type ListeningFlow = {
  prelisten: {
    scenarioTitle: string;
    goalBullets: string[];
    keywords: ListeningKeyword[];
    successCriteria: string[];
  };
  media: {
    subtitlesEn: string;
    segments: ListeningSegment[];
    keyPhrase: string;
    durationSec: number;
    audioUrl: string;
  };
  quiz: {
    passThreshold: number;
    questions: ListeningQuestion[];
  };
  summary: {
    resultBullets: string[];
    rememberPhrase: string;
  };
};

type ListeningItemState = {
  phase: ListeningPhase;
  questionIndex: number;
  showKeywordsTranslate: boolean;
  subtitlesMode: SubtitlesMode;
  playbackRate: PlaybackRate;
  firstListenCompleted: boolean;
  segmentIndex: number;
  selectedOption: number | null;
  orderSelection: number[];
  feedback: string;
  feedbackType: FeedbackType;
  checkedResult: boolean | null;
  resultsByQuestion: Record<number, boolean>;
  score: number;
  passed: boolean | null;
};

function createDefaultItemState(): ListeningItemState {
  return {
    phase: 'prelisten',
    questionIndex: 0,
    showKeywordsTranslate: false,
    subtitlesMode: 'off',
    playbackRate: 1,
    firstListenCompleted: false,
    segmentIndex: 0,
    selectedOption: null,
    orderSelection: [],
    feedback: '',
    feedbackType: null,
    checkedResult: null,
    resultsByQuestion: {},
    score: 0,
    passed: null,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionQuestion(value: unknown): value is OptionQuestion {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const question = value as Record<string, unknown>;
  if (
    question.type !== 'single_choice' &&
    question.type !== 'heard_phrase' &&
    question.type !== 'fill_gap'
  ) {
    return false;
  }

  return (
    isNonEmptyString(question.question) &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every((option) => isNonEmptyString(option)) &&
    typeof question.correctIndex === 'number' &&
    Number.isInteger(question.correctIndex) &&
    question.correctIndex >= 0 &&
    question.correctIndex < question.options.length &&
    isNonEmptyString(question.successFeedback) &&
    isNonEmptyString(question.errorFeedback)
  );
}

function isOrderLinesQuestion(value: unknown): value is OrderLinesQuestion {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const question = value as Record<string, unknown>;
  if (question.type !== 'order_lines') {
    return false;
  }

  if (
    !isNonEmptyString(question.question) ||
    !Array.isArray(question.lines) ||
    question.lines.length < 2 ||
    !question.lines.every((line) => isNonEmptyString(line)) ||
    !Array.isArray(question.correctOrder) ||
    question.correctOrder.length !== question.lines.length ||
    !isNonEmptyString(question.successFeedback) ||
    !isNonEmptyString(question.errorFeedback)
  ) {
    return false;
  }

  const requiredIndexes = new Set(
    Array.from({ length: question.lines.length }, (_, idx) => idx)
  );

  for (const index of question.correctOrder) {
    if (
      typeof index !== 'number' ||
      !Number.isInteger(index) ||
      !requiredIndexes.has(index)
    ) {
      return false;
    }
    requiredIndexes.delete(index);
  }

  return requiredIndexes.size === 0;
}

function isListeningFlow(value: unknown): value is ListeningFlow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const flow = value as Record<string, unknown>;
  const prelisten = flow.prelisten as Record<string, unknown> | undefined;
  if (
    !prelisten ||
    !isNonEmptyString(prelisten.scenarioTitle) ||
    !Array.isArray(prelisten.goalBullets) ||
    prelisten.goalBullets.length < 1 ||
    !prelisten.goalBullets.every((item) => isNonEmptyString(item)) ||
    !Array.isArray(prelisten.successCriteria) ||
    prelisten.successCriteria.length < 1 ||
    !prelisten.successCriteria.every((item) => isNonEmptyString(item)) ||
    !Array.isArray(prelisten.keywords) ||
    prelisten.keywords.length < 1
  ) {
    return false;
  }

  const validKeywords = prelisten.keywords.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const keyword = item as Record<string, unknown>;
    return (
      isNonEmptyString(keyword.word) && typeof keyword.translate === 'string'
    );
  });
  if (!validKeywords) {
    return false;
  }

  const media = flow.media as Record<string, unknown> | undefined;
  if (
    !media ||
    !isNonEmptyString(media.subtitlesEn) ||
    !isNonEmptyString(media.keyPhrase) ||
    !isNonEmptyString(media.audioUrl) ||
    !isFiniteNumber(media.durationSec) ||
    media.durationSec <= 0 ||
    !Array.isArray(media.segments) ||
    media.segments.length < 2
  ) {
    return false;
  }

  let previousEnd = -1;
  const validSegments = media.segments.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const segment = item as Record<string, unknown>;
    const startSec = segment.startSec;
    const endSec = segment.endSec;
    const durationSec = media.durationSec as number;

    if (!isFiniteNumber(startSec) || !isFiniteNumber(endSec)) {
      return false;
    }
    if (startSec < 0 || endSec <= startSec || endSec > durationSec + 0.01) {
      return false;
    }
    if (startSec < previousEnd) {
      return false;
    }
    previousEnd = endSec;

    return (
      isNonEmptyString(segment.id) &&
      (segment.speaker === 'A' || segment.speaker === 'B') &&
      isNonEmptyString(segment.text) &&
      typeof segment.translate === 'string'
    );
  });
  if (!validSegments) {
    return false;
  }

  const quiz = flow.quiz as Record<string, unknown> | undefined;
  if (
    !quiz ||
    !isFiniteNumber(quiz.passThreshold) ||
    quiz.passThreshold < 0 ||
    quiz.passThreshold > 1 ||
    !Array.isArray(quiz.questions) ||
    quiz.questions.length < 2 ||
    quiz.questions.length > 4
  ) {
    return false;
  }

  const validQuestions = quiz.questions.every(
    (item) => isOptionQuestion(item) || isOrderLinesQuestion(item)
  );
  if (!validQuestions) {
    return false;
  }

  const summary = flow.summary as Record<string, unknown> | undefined;
  if (
    !summary ||
    !Array.isArray(summary.resultBullets) ||
    summary.resultBullets.length < 1 ||
    !summary.resultBullets.every((item) => isNonEmptyString(item)) ||
    !isNonEmptyString(summary.rememberPhrase)
  ) {
    return false;
  }

  return true;
}

function extractListeningFlow(item: LessonItem | null): ListeningFlow | null {
  if (!item) {
    return null;
  }
  const flow = (item.content as Record<string, unknown>).listeningFlow;
  return isListeningFlow(flow) ? flow : null;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export default function ListeningPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = Number(params.id);
  const session = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<LessonItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemStateById, setItemStateById] = useState<
    Record<number, ListeningItemState>
  >({});

  const loadKeyRef = useRef('');
  const markedLearningRef = useRef<Set<number>>(new Set());
  const markedKnownRef = useRef<Set<number>>(new Set());
  const repeatTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const currentFlow = useMemo(
    () => extractListeningFlow(selectedItem),
    [selectedItem]
  );

  const isPlayableListening = Boolean(currentFlow);

  const currentState = useMemo(() => {
    if (!selectedItem) {
      return createDefaultItemState();
    }
    return itemStateById[selectedItem.id] ?? createDefaultItemState();
  }, [itemStateById, selectedItem]);

  const currentQuestion = useMemo(() => {
    if (!currentFlow) {
      return null;
    }
    return currentFlow.quiz.questions[currentState.questionIndex] ?? null;
  }, [currentFlow, currentState.questionIndex]);

  const clearRepeatTimer = () => {
    if (repeatTimerRef.current !== null) {
      window.clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  };

  const setStateByItemId = useCallback(
    (
      itemId: number,
      updater: (prev: ListeningItemState) => ListeningItemState
    ) => {
      setItemStateById((prev) => {
        const current = prev[itemId] ?? createDefaultItemState();
        return {
          ...prev,
          [itemId]: updater(current),
        };
      });
    },
    []
  );

  const setCurrentState = useCallback(
    (updater: (prev: ListeningItemState) => ListeningItemState) => {
      if (!selectedItem) {
        return;
      }
      setStateByItemId(selectedItem.id, updater);
    },
    [selectedItem, setStateByItemId]
  );

  const markFirstListenCompleted = useCallback(
    (itemId: number) => {
      setStateByItemId(itemId, (prev) => ({
        ...prev,
        firstListenCompleted: true,
      }));
    },
    [setStateByItemId]
  );

  useEffect(() => {
    return () => {
      clearRepeatTimer();
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!Number.isFinite(lessonId)) {
        setLoading(false);
        setError(t('no_listening_selected'));
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
          'listening',
          session.accessToken
        );
        setItems(data);
        setSelectedItemId(data[0]?.id ?? null);
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
      return;
    }
    if (itemStateById[selectedItem.id]) {
      return;
    }
    setStateByItemId(selectedItem.id, () => createDefaultItemState());
  }, [selectedItem, itemStateById, setStateByItemId]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.playbackRate = currentState.playbackRate;
  }, [currentState.playbackRate, selectedItemId]);

  useEffect(() => {
    if (!currentFlow || !selectedItem) {
      return;
    }

    const maxQuestionIndex = Math.max(currentFlow.quiz.questions.length - 1, 0);
    if (currentState.questionIndex > maxQuestionIndex) {
      setCurrentState((prev) => ({
        ...prev,
        questionIndex: maxQuestionIndex,
      }));
    }

    const maxSegmentIndex = Math.max(currentFlow.media.segments.length - 1, 0);
    if (currentState.segmentIndex > maxSegmentIndex) {
      setCurrentState((prev) => ({
        ...prev,
        segmentIndex: maxSegmentIndex,
      }));
    }
  }, [
    currentFlow,
    currentState.questionIndex,
    currentState.segmentIndex,
    selectedItem,
    setCurrentState,
  ]);

  const updateItemStatus = async (
    itemId: number,
    status: 'learning' | 'known'
  ): Promise<void> => {
    if (!Number.isFinite(lessonId) || !session.accessToken) {
      return;
    }

    await updateLessonItemStatus(lessonId, itemId, status, session.accessToken);

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status } : item))
    );
  };

  const markLearningIfNeeded = async (): Promise<void> => {
    if (!selectedItem || selectedItem.status === 'known') {
      return;
    }

    if (markedLearningRef.current.has(selectedItem.id)) {
      return;
    }

    await updateItemStatus(selectedItem.id, 'learning');
    markedLearningRef.current.add(selectedItem.id);
  };

  const markKnownIfNeeded = async (): Promise<void> => {
    if (!selectedItem || selectedItem.status === 'known') {
      return;
    }

    if (markedKnownRef.current.has(selectedItem.id)) {
      return;
    }

    await updateItemStatus(selectedItem.id, 'known');
    markedKnownRef.current.add(selectedItem.id);
  };

  const onStartListening = async () => {
    try {
      await markLearningIfNeeded();
      setCurrentState((prev) => ({
        ...prev,
        phase: 'watch',
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const onToggleKeywordsTranslate = () => {
    setCurrentState((prev) => ({
      ...prev,
      showKeywordsTranslate: !prev.showKeywordsTranslate,
    }));
  };

  const onToggleSubtitles = async () => {
    const nextMode: SubtitlesMode =
      currentState.subtitlesMode === 'off' ? 'en' : 'off';
    setCurrentState((prev) => ({
      ...prev,
      subtitlesMode: nextMode,
    }));

    if (nextMode === 'off') {
      return;
    }

    try {
      await markLearningIfNeeded();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const applyPlaybackRate = (rate: PlaybackRate) => {
    setCurrentState((prev) => ({
      ...prev,
      playbackRate: rate,
    }));

    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const onReplayMedia = () => {
    clearRepeatTimer();

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
    }
  };

  const onRepeatSegment = (segment: ListeningSegment) => {
    clearRepeatTimer();

    if (!audioRef.current) {
      return;
    }

    const durationMs = Math.max(
      250,
      (segment.endSec - segment.startSec) * 1000
    );

    audioRef.current.currentTime = segment.startSec;
    audioRef.current.playbackRate = currentState.playbackRate;
    void audioRef.current.play();
    repeatTimerRef.current = window.setTimeout(() => {
      audioRef.current?.pause();
    }, durationMs);
  };

  const onWatchReady = async () => {
    try {
      await markLearningIfNeeded();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
      return;
    }

    setCurrentState((prev) => ({
      ...prev,
      phase: 'quiz',
      questionIndex: 0,
      selectedOption: null,
      orderSelection: [],
      feedback: '',
      feedbackType: null,
      checkedResult: null,
      resultsByQuestion: {},
      score: 0,
      passed: null,
    }));
  };

  const isCurrentQuestionReady = () => {
    if (!currentQuestion) {
      return false;
    }

    if (currentQuestion.type === 'order_lines') {
      return (
        currentState.orderSelection.length === currentQuestion.lines.length
      );
    }

    return currentState.selectedOption !== null;
  };

  const onToggleOrderLine = (lineIndex: number) => {
    setCurrentState((prev) => {
      const exists = prev.orderSelection.includes(lineIndex);
      return {
        ...prev,
        orderSelection: exists
          ? prev.orderSelection.filter((index) => index !== lineIndex)
          : [...prev.orderSelection, lineIndex],
      };
    });
  };

  const onCheckAnswer = async () => {
    if (!currentQuestion || !isCurrentQuestionReady()) {
      return;
    }

    try {
      await markLearningIfNeeded();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
      return;
    }

    const isCorrect =
      currentQuestion.type === 'order_lines'
        ? arraysEqual(currentState.orderSelection, currentQuestion.correctOrder)
        : currentState.selectedOption === currentQuestion.correctIndex;

    setCurrentState((prev) => ({
      ...prev,
      checkedResult: isCorrect,
      feedback: isCorrect
        ? currentQuestion.successFeedback
        : currentQuestion.errorFeedback,
      feedbackType: isCorrect ? 'success' : 'error',
    }));
  };

  const finalizeQuiz = async (results: Record<number, boolean>) => {
    if (!currentFlow) {
      return;
    }

    const total = currentFlow.quiz.questions.length;
    const score = Object.values(results).filter(Boolean).length;
    const passRatio = total > 0 ? score / total : 0;
    const isPassed = passRatio >= currentFlow.quiz.passThreshold;

    setCurrentState((prev) => ({
      ...prev,
      phase: 'summary',
      score,
      passed: isPassed,
      resultsByQuestion: results,
    }));

    if (!isPassed) {
      return;
    }

    try {
      await markKnownIfNeeded();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const onProceedAfterCheck = async () => {
    if (
      !currentQuestion ||
      currentState.checkedResult === null ||
      !currentFlow
    ) {
      return;
    }

    const nextResults = {
      ...currentState.resultsByQuestion,
      [currentState.questionIndex]: currentState.checkedResult,
    };

    const isLastQuestion =
      currentState.questionIndex >= currentFlow.quiz.questions.length - 1;

    if (isLastQuestion) {
      await finalizeQuiz(nextResults);
      return;
    }

    setCurrentState((prev) => ({
      ...prev,
      questionIndex: prev.questionIndex + 1,
      selectedOption: null,
      orderSelection: [],
      feedback: '',
      feedbackType: null,
      checkedResult: null,
      resultsByQuestion: nextResults,
      score: Object.values(nextResults).filter(Boolean).length,
    }));
  };

  const onRetryQuestion = () => {
    setCurrentState((prev) => ({
      ...prev,
      selectedOption: null,
      orderSelection: [],
      feedback: '',
      feedbackType: null,
      checkedResult: null,
    }));
  };

  const onRewatch = () => {
    setCurrentState((prev) => ({
      ...prev,
      phase: 'watch',
      feedback: '',
      feedbackType: null,
      checkedResult: null,
    }));
  };

  const onRetryQuiz = () => {
    setCurrentState((prev) => ({
      ...prev,
      phase: 'quiz',
      questionIndex: 0,
      selectedOption: null,
      orderSelection: [],
      feedback: '',
      feedbackType: null,
      checkedResult: null,
      resultsByQuestion: {},
      score: 0,
      passed: null,
    }));
  };

  const renderQuestion = () => {
    if (!currentQuestion) {
      return <p className={styles.helperText}>{t('section_empty')}</p>;
    }

    if (currentQuestion.type === 'order_lines') {
      return (
        <>
          <p className={styles.quizQuestion}>{currentQuestion.question}</p>
          <div className={styles.orderLinesList}>
            {currentQuestion.lines.map((line, lineIndex) => {
              const isSelected =
                currentState.orderSelection.includes(lineIndex);
              const orderPosition =
                currentState.orderSelection.indexOf(lineIndex);

              return (
                <button
                  key={`${line}-${lineIndex}`}
                  type="button"
                  className={`${styles.orderLineButton}${
                    isSelected ? ` ${styles.orderLineButtonSelected}` : ''
                  }`}
                  onClick={() => onToggleOrderLine(lineIndex)}
                >
                  <span className={styles.orderLineIndex}>
                    {isSelected ? orderPosition + 1 : '·'}
                  </span>
                  <span className={styles.orderLineText}>{line}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.inlineActions}>
            <PrimaryButton styleType="ghost" onClick={onRetryQuestion}>
              {t('listening_retry_question')}
            </PrimaryButton>
          </div>
        </>
      );
    }

    return (
      <>
        <p className={styles.quizQuestion}>{currentQuestion.question}</p>
        <div className={styles.options}>
          {currentQuestion.options.map((option, optionIndex) => (
            <button
              key={`${option}-${optionIndex}`}
              type="button"
              className={`${styles.optionButton}${
                currentState.selectedOption === optionIndex
                  ? ` ${styles.optionSelected}`
                  : ''
              }`}
              onClick={() =>
                setCurrentState((prev) => ({
                  ...prev,
                  selectedOption: optionIndex,
                }))
              }
            >
              {option}
            </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <AppShell title={t('listening')} subtitle={t('listening_subtitle')}>
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

        {!loading && !items.length ? (
          <RoundedCard>
            <EmptyState
              title={t('no_listening_selected')}
              subtitle={t('section_empty')}
            />
          </RoundedCard>
        ) : null}

        {!loading && items.length ? (
          <RoundedCard>
            <div className={styles.taskHeader}>
              <strong>{t('select_listening_task')}</strong>
            </div>
            <div className={styles.tasks}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className={`${styles.task}${
                    item.id === selectedItemId ? ` ${styles.taskActive}` : ''
                  }`}
                >
                  <span className={styles.taskTitle}>{item.title}</span>
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
          </RoundedCard>
        ) : null}

        {!loading && selectedItem && (!currentFlow || !isPlayableListening) ? (
          <RoundedCard>
            <EmptyState
              title={t('listening_missing_structure')}
              subtitle={t('section_empty')}
            />
          </RoundedCard>
        ) : null}

        {!loading && selectedItem && currentFlow && isPlayableListening ? (
          <RoundedCard>
            <div className={styles.phaseHeader}>
              <strong>
                {currentFlow.prelisten.scenarioTitle || selectedItem.title}
              </strong>
              <Badge tone="neutral">
                {currentState.phase === 'prelisten'
                  ? t('listening_prep_title')
                  : currentState.phase === 'watch'
                    ? t('listening_listen_title')
                    : currentState.phase === 'quiz'
                      ? t('listening_quiz_title')
                      : t('listening_summary_title')}
              </Badge>
            </div>
            <ProgressBar
              value={
                currentState.phase === 'prelisten'
                  ? 25
                  : currentState.phase === 'watch'
                    ? 50
                    : currentState.phase === 'quiz'
                      ? 75
                      : 100
              }
            />
          </RoundedCard>
        ) : null}

        {!loading &&
        selectedItem &&
        currentFlow &&
        isPlayableListening &&
        currentState.phase === 'prelisten' ? (
          <RoundedCard>
            <div className={styles.phaseBlock}>
              <h3 className={styles.phaseTitle}>{t('listening_prep_title')}</h3>
              <p className={styles.sectionTitle}>{t('listening_goals')}</p>
              <ul className={styles.listBullets}>
                {currentFlow.prelisten.goalBullets.map((goal, idx) => (
                  <li key={`${goal}-${idx}`}>{goal}</li>
                ))}
              </ul>

              <p className={styles.sectionTitle}>{t('listening_keywords')}</p>
              <div className={styles.keywordList}>
                {currentFlow.prelisten.keywords.map((keyword, idx) => (
                  <div
                    key={`${keyword.word}-${idx}`}
                    className={styles.keywordChip}
                  >
                    <span>{keyword.word}</span>
                    {currentState.showKeywordsTranslate ? (
                      <span className={styles.keywordTranslate}>
                        {keyword.translate}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <p className={styles.sectionTitle}>
                {t('listening_success_criteria')}
              </p>
              <ul className={styles.listBullets}>
                {currentFlow.prelisten.successCriteria.map((criterion, idx) => (
                  <li key={`${criterion}-${idx}`}>{criterion}</li>
                ))}
              </ul>
            </div>
            <div className={styles.actions}>
              <PrimaryButton
                styleType="ghost"
                onClick={onToggleKeywordsTranslate}
              >
                {t('listening_toggle_keywords_translate')}
              </PrimaryButton>
              <PrimaryButton onClick={() => void onStartListening()}>
                {t('listening_start')}
              </PrimaryButton>
            </div>
          </RoundedCard>
        ) : null}

        {!loading &&
        selectedItem &&
        currentFlow &&
        isPlayableListening &&
        currentState.phase === 'watch' ? (
          <RoundedCard>
            <div className={styles.phaseBlock}>
              <div className={styles.player}>
                <audio
                  ref={audioRef}
                  controls
                  src={currentFlow.media.audioUrl}
                  className={styles.audioPlayer}
                  onEnded={() => markFirstListenCompleted(selectedItem.id)}
                />
              </div>

              <div className={styles.watchControls}>
                <PrimaryButton
                  styleType="ghost"
                  onClick={() => void onToggleSubtitles()}
                >
                  {currentState.subtitlesMode === 'off'
                    ? t('show_subtitles')
                    : t('hide_subtitles')}
                </PrimaryButton>
                <PrimaryButton styleType="ghost" onClick={onReplayMedia}>
                  {t('listening_replay')}
                </PrimaryButton>
                <PrimaryButton
                  styleType="ghost"
                  onClick={() => applyPlaybackRate(1)}
                >
                  {t('listening_speed')} 1x
                </PrimaryButton>
                <PrimaryButton
                  styleType="ghost"
                  onClick={() => applyPlaybackRate(0.85)}
                >
                  {t('listening_speed')} 0.85x
                </PrimaryButton>
                <PrimaryButton
                  styleType="ghost"
                  onClick={() => applyPlaybackRate(0.75)}
                >
                  {t('listening_speed')} 0.75x
                </PrimaryButton>
              </div>

              <div className={styles.segmentBlock}>
                <p className={styles.sectionTitle}>
                  {t('listening_repeat_segment')}
                </p>
                <div className={styles.segmentList}>
                  {currentFlow.media.segments.map((segment, idx) => (
                    <button
                      key={segment.id}
                      type="button"
                      className={`${styles.segmentButton}${
                        currentState.segmentIndex === idx
                          ? ` ${styles.segmentButtonActive}`
                          : ''
                      }`}
                      onClick={() => {
                        setCurrentState((prev) => ({
                          ...prev,
                          segmentIndex: idx,
                        }));
                        onRepeatSegment(segment);
                      }}
                    >
                      <span className={styles.segmentSpeaker}>
                        {segment.speaker}:
                      </span>{' '}
                      {segment.text}
                    </button>
                  ))}
                </div>
              </div>

              {currentState.subtitlesMode === 'en' ? (
                <p className={styles.subtitles}>
                  {currentFlow.media.subtitlesEn}
                </p>
              ) : null}

              {currentState.firstListenCompleted ? (
                <div className={styles.keyPhrase}>
                  <p className={styles.sectionTitle}>
                    {t('listening_show_key_phrase')}
                  </p>
                  <p>{currentFlow.media.keyPhrase}</p>
                </div>
              ) : (
                <p className={styles.helperText}>
                  {t('listening_try_first_global')}
                </p>
              )}
            </div>

            <div className={styles.actions}>
              <a
                href={currentFlow.media.audioUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.linkReset}
              >
                <PrimaryButton styleType="ghost">
                  {t('open_media')}
                </PrimaryButton>
              </a>
              <PrimaryButton onClick={() => void onWatchReady()}>
                {t('listening_watch_ready')}
              </PrimaryButton>
            </div>
          </RoundedCard>
        ) : null}

        {!loading &&
        selectedItem &&
        currentFlow &&
        isPlayableListening &&
        currentState.phase === 'quiz' ? (
          <RoundedCard>
            <div className={styles.phaseBlock}>
              <h3 className={styles.phaseTitle}>{t('listening_quiz_title')}</h3>
              <p className={styles.quizProgress}>
                {t('step')} {currentState.questionIndex + 1}/
                {currentFlow.quiz.questions.length}
              </p>
              {renderQuestion()}
              {currentState.feedback ? (
                <p
                  className={`${styles.quizFeedback}${
                    currentState.feedbackType === 'success'
                      ? ` ${styles.quizFeedbackSuccess}`
                      : ` ${styles.quizFeedbackError}`
                  }`}
                >
                  {currentState.feedback}
                </p>
              ) : null}
            </div>

            <div className={styles.actions}>
              {currentState.checkedResult === null ? (
                <PrimaryButton
                  disabled={!isCurrentQuestionReady()}
                  onClick={() => void onCheckAnswer()}
                >
                  {t('rules_check')}
                </PrimaryButton>
              ) : (
                <>
                  <PrimaryButton styleType="ghost" onClick={onRetryQuestion}>
                    {t('listening_retry_question')}
                  </PrimaryButton>
                  <PrimaryButton onClick={() => void onProceedAfterCheck()}>
                    {t('listening_next_question')}
                  </PrimaryButton>
                </>
              )}
            </div>
          </RoundedCard>
        ) : null}

        {!loading &&
        selectedItem &&
        currentFlow &&
        isPlayableListening &&
        currentState.phase === 'summary' ? (
          <RoundedCard>
            <div className={styles.phaseBlock}>
              <h3 className={styles.phaseTitle}>
                {t('listening_summary_title')}
              </h3>
              <p
                className={`${styles.summaryState}${
                  currentState.passed
                    ? ` ${styles.summarySuccess}`
                    : ` ${styles.summaryWarning}`
                }`}
              >
                {currentState.passed
                  ? `${t('listening_passed')} (${currentState.score}/${currentFlow.quiz.questions.length})`
                  : `${t('listening_not_passed_retry')} (${currentState.score}/${currentFlow.quiz.questions.length})`}
              </p>
              <ul className={styles.listBullets}>
                {currentFlow.summary.resultBullets.map((bullet, idx) => (
                  <li key={`${bullet}-${idx}`}>{bullet}</li>
                ))}
              </ul>
              <p className={styles.rememberPhrase}>
                {currentFlow.summary.rememberPhrase}
              </p>
            </div>

            <div className={styles.actions}>
              <PrimaryButton styleType="ghost" onClick={onRewatch}>
                {t('listening_rewatch')}
              </PrimaryButton>
              <PrimaryButton styleType="ghost" onClick={onRetryQuiz}>
                {t('listening_retry_question')}
              </PrimaryButton>
              <PrimaryButton
                onClick={() => router.push(`/lesson/${lessonId}/dialogue`)}
              >
                {t('listening_to_dialogue')}
              </PrimaryButton>
              <PrimaryButton
                styleType="ghost"
                onClick={() => router.push(`/lesson/${lessonId}/vocabulary`)}
              >
                {t('listening_to_vocabulary')}
              </PrimaryButton>
            </div>
          </RoundedCard>
        ) : null}
      </div>
    </AppShell>
  );
}
