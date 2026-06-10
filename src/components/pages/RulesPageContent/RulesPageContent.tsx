'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import { AppShell } from '@/components/ui/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RoundedCard } from '@/components/ui/RoundedCard';
import { getLessonSectionItems, updateLessonItemStatus } from '@/lib/api';
import type { LessonItem } from '@/lib/api';
import { useSession } from '@/src/hooks/useSession';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useMemo, useRef, useState } from 'react';

import styles from './RulesPageContent.module.scss';
import {
  DEFAULT_RULE_VIEW_STATE,
  PRACTICE_STEP_INDEX,
  SUMMARY_STEP_INDEX,
  TOTAL_STEPS,
} from './constants';
import type {
  TRuleItemStatus,
  TRulePracticeFeedbackType,
  TRuleViewState,
  TRulesPageContentProps,
} from './types';
import { extractRuleFlow } from './utils/ruleFlow';

export const RulesPageContent: FC<TRulesPageContentProps> = ({ lessonId }) => {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const loadKeyRef = useRef('');
  const learningMarkedRef = useRef<Set<number>>(new Set());
  const knownMarkedRef = useRef<Set<number>>(new Set());

  const [items, setItems] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [ruleIndex, setRuleIndex] = useState(0);
  const [ruleStateByItemId, setRuleStateByItemId] = useState<
    Record<number, TRuleViewState>
  >({});
  const [stepIndex, setStepIndex] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState('');
  const [practiceFeedbackType, setPracticeFeedbackType] =
    useState<TRulePracticeFeedbackType>(null);
  const [practicePassed, setPracticePassed] = useState(false);

  const currentItem = items[ruleIndex] ?? null;
  const currentFlow = useMemo(
    () => extractRuleFlow(currentItem),
    [currentItem]
  );
  const currentPractice = currentFlow?.practice[practiceIndex] ?? null;
  const hasNextRule = ruleIndex < items.length - 1;

  const setRuleStateForItem = (
    itemId: number,
    updater: (prev: TRuleViewState) => TRuleViewState
  ) => {
    setRuleStateByItemId((prev) => {
      const base = prev[itemId] ?? DEFAULT_RULE_VIEW_STATE;
      return {
        ...prev,
        [itemId]: updater(base),
      };
    });
  };

  const setCurrentRuleState = (
    updater: (prev: TRuleViewState) => TRuleViewState
  ) => {
    if (!currentItem) {
      return;
    }
    setRuleStateForItem(currentItem.id, updater);
  };

  useEffect(() => {
    if (!Number.isFinite(lessonId)) {
      setLoading(false);
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

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getLessonSectionItems(
          lessonId,
          'rules',
          session.accessToken!
        );
        setItems(data);
        setRuleIndex(0);
        setRuleStateByItemId({});
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
    lessonId,
    session.accessToken,
    session.error,
    session.loading,
    session.telegramId,
    t,
  ]);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    if (ruleIndex < 0 || ruleIndex >= items.length) {
      setRuleIndex(0);
    }
  }, [items, ruleIndex]);

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    const saved = ruleStateByItemId[currentItem.id] ?? DEFAULT_RULE_VIEW_STATE;
    const maxPracticeIndex = currentFlow
      ? Math.max(currentFlow.practice.length - 1, 0)
      : 0;
    const safePracticeIndex = Math.min(saved.practiceIndex, maxPracticeIndex);
    const safeStepIndex = Math.min(
      Math.max(saved.stepIndex, 0),
      TOTAL_STEPS - 1
    );

    setStepIndex(safeStepIndex);
    setPracticeIndex(safePracticeIndex);
    setPracticePassed(saved.practicePassed);
    setSelectedOption(null);
    setPracticeFeedback('');
    setPracticeFeedbackType(null);
  }, [currentItem, currentFlow, ruleStateByItemId]);

  const setItemStatus = async (itemId: number, status: TRuleItemStatus) => {
    if (!Number.isFinite(lessonId) || !session.accessToken) {
      return;
    }
    await updateLessonItemStatus(lessonId, itemId, status, session.accessToken);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status } : item))
    );
  };

  const markLearningIfNeeded = async () => {
    if (!currentItem || currentItem.status === 'known') {
      return;
    }
    if (learningMarkedRef.current.has(currentItem.id)) {
      return;
    }
    await setItemStatus(currentItem.id, 'learning');
    learningMarkedRef.current.add(currentItem.id);
  };

  const markKnownIfNeeded = async () => {
    if (!currentItem || currentItem.status === 'known') {
      return;
    }
    if (knownMarkedRef.current.has(currentItem.id)) {
      return;
    }
    await setItemStatus(currentItem.id, 'known');
    knownMarkedRef.current.add(currentItem.id);
  };

  const goNextStep = async () => {
    if (!currentFlow) {
      return;
    }
    try {
      if (stepIndex === 0) {
        await markLearningIfNeeded();
      }

      if (stepIndex < PRACTICE_STEP_INDEX) {
        const nextStep = stepIndex + 1;
        setStepIndex(nextStep);
        setCurrentRuleState((prev) => ({ ...prev, stepIndex: nextStep }));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const goBackStep = () => {
    if (stepIndex > 0) {
      const nextStep = stepIndex - 1;
      setStepIndex(nextStep);
      setCurrentRuleState((prev) => ({ ...prev, stepIndex: nextStep }));
      return;
    }
    if (ruleIndex > 0) {
      setRuleIndex((prev) => prev - 1);
    }
  };

  const onSelectRule = (index: number) => {
    if (index < 0 || index >= items.length || index === ruleIndex) {
      return;
    }
    setRuleIndex(index);
    setSelectedOption(null);
    setPracticeFeedback('');
    setPracticeFeedbackType(null);
  };

  const goToNextRuleOrDialogue = () => {
    if (hasNextRule) {
      setRuleIndex((prev) => prev + 1);
      return;
    }
    router.push(`/lesson/${lessonId}/dialogue`);
  };

  const retryRule = () => {
    setStepIndex(0);
    setPracticeIndex(0);
    setSelectedOption(null);
    setPracticeFeedback('');
    setPracticeFeedbackType(null);
    setPracticePassed(false);
    setCurrentRuleState(() => ({
      stepIndex: 0,
      practiceIndex: 0,
      practicePassed: false,
    }));
  };

  const onCheckPractice = async () => {
    if (!currentFlow || !currentPractice || selectedOption === null) {
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

    const isCorrect = selectedOption === currentPractice.correctIndex;
    if (!isCorrect) {
      setPracticeFeedback(currentPractice.errorFeedback || t('rules_almost'));
      setPracticeFeedbackType('error');
      return;
    }

    setPracticeFeedback(currentPractice.successFeedback || t('rules_correct'));
    setPracticeFeedbackType('success');

    const isLastPractice = practiceIndex >= currentFlow.practice.length - 1;
    if (!isLastPractice) {
      const nextPracticeIndex = practiceIndex + 1;
      setPracticeIndex(nextPracticeIndex);
      setSelectedOption(null);
      setPracticeFeedback('');
      setPracticeFeedbackType(null);
      setCurrentRuleState((prev) => ({
        ...prev,
        practiceIndex: nextPracticeIndex,
      }));
      return;
    }

    setPracticePassed(true);
    setStepIndex(SUMMARY_STEP_INDEX);
    setCurrentRuleState((prev) => ({
      ...prev,
      stepIndex: SUMMARY_STEP_INDEX,
      practicePassed: true,
    }));
    try {
      await markKnownIfNeeded();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('auth_failed')
      );
    }
  };

  const renderCurrentStep = () => {
    if (!currentFlow) {
      return (
        <RoundedCard>
          <EmptyState
            title={t('rules_missing_structure')}
            subtitle={t('section_empty')}
          />
        </RoundedCard>
      );
    }

    if (stepIndex === 0) {
      return (
        <RoundedCard>
          <div className={styles.stepCard}>
            <h3 className={styles.stepTitle}>{currentFlow.essence.title}</h3>
            <p className={styles.stepText}>{currentFlow.essence.description}</p>
          </div>
        </RoundedCard>
      );
    }

    if (stepIndex === 1) {
      return (
        <RoundedCard>
          <div className={styles.stepCard}>
            <h3 className={styles.stepTitle}>{t('rules_formula_title')}</h3>
            <div className={styles.patternList}>
              {currentFlow.formula.patterns.map((pattern, idx) => (
                <div
                  key={`${pattern.template}-${idx}`}
                  className={styles.patternCard}
                >
                  <p className={styles.patternTemplate}>{pattern.template}</p>
                  <p className={styles.patternHint}>{pattern.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </RoundedCard>
      );
    }

    if (stepIndex === 2) {
      return (
        <RoundedCard>
          <div className={styles.stepCard}>
            <h3 className={styles.stepTitle}>{t('rules_examples_title')}</h3>
            <div className={styles.examplesList}>
              {currentFlow.examples.map((example, idx) => (
                <div
                  key={`${example.text}-${idx}`}
                  className={styles.exampleCard}
                >
                  <p className={styles.exampleText}>{example.text}</p>
                  <p className={styles.exampleTranslate}>{example.translate}</p>
                </div>
              ))}
            </div>
          </div>
        </RoundedCard>
      );
    }

    if (stepIndex === 3) {
      return (
        <RoundedCard>
          <div className={styles.stepCard}>
            <h3 className={styles.stepTitle}>{t('rules_mistake_title')}</h3>
            <div className={styles.mistakeWrong}>
              ❌ {currentFlow.mistake.wrong}
            </div>
            <div className={styles.mistakeCorrect}>
              ✅ {currentFlow.mistake.correct}
            </div>
            <p className={styles.stepText}>{currentFlow.mistake.explanation}</p>
          </div>
        </RoundedCard>
      );
    }

    if (stepIndex === PRACTICE_STEP_INDEX) {
      return (
        <RoundedCard>
          <div className={styles.stepCard}>
            <h3 className={styles.stepTitle}>{t('rules_practice_title')}</h3>
            {currentPractice ? (
              <>
                <p className={styles.practiceQuestion}>
                  {currentPractice.question}
                </p>
                <div className={styles.options}>
                  {currentPractice.options.map((option, idx) => (
                    <button
                      key={`${option}-${idx}`}
                      type="button"
                      className={`${styles.optionButton}${selectedOption === idx ? ` ${styles.optionSelected}` : ''}`}
                      onClick={() => setSelectedOption(idx)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {practiceFeedback ? (
                  <p
                    className={`${styles.practiceFeedback} ${
                      practiceFeedbackType === 'success'
                        ? styles.practiceFeedbackSuccess
                        : styles.practiceFeedbackError
                    }`}
                  >
                    {practiceFeedback}
                  </p>
                ) : null}
              </>
            ) : (
              <p className={styles.stepText}>{t('rules_missing_structure')}</p>
            )}
          </div>
        </RoundedCard>
      );
    }

    return (
      <RoundedCard>
        <div className={styles.stepCard}>
          <h3 className={styles.stepTitle}>{t('rules_summary_title')}</h3>
          <ul className={styles.summaryList}>
            {currentFlow.summary.bullets.map((bullet, idx) => (
              <li key={`${bullet}-${idx}`} className={styles.summaryItem}>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </RoundedCard>
    );
  };

  const renderActions = () => {
    if (!currentItem) {
      return null;
    }

    const secondaryVisible = stepIndex > 0 || ruleIndex > 0;

    if (!currentFlow) {
      return (
        <div className={styles.actions}>
          {secondaryVisible ? (
            <PrimaryButton styleType="ghost" onClick={goBackStep}>
              {t('back')}
            </PrimaryButton>
          ) : null}
          <PrimaryButton onClick={goToNextRuleOrDialogue}>
            {hasNextRule ? t('rules_next') : t('rules_go_dialogue')}
          </PrimaryButton>
        </div>
      );
    }

    if (stepIndex === PRACTICE_STEP_INDEX) {
      return (
        <div className={styles.actions}>
          <PrimaryButton styleType="ghost" onClick={goBackStep}>
            {t('back')}
          </PrimaryButton>
          <PrimaryButton
            onClick={() => void onCheckPractice()}
            disabled={selectedOption === null}
          >
            {t('rules_check')}
          </PrimaryButton>
        </div>
      );
    }

    if (stepIndex === SUMMARY_STEP_INDEX) {
      return (
        <div className={styles.actions}>
          <PrimaryButton styleType="ghost" onClick={retryRule}>
            {t('rules_retry')}
          </PrimaryButton>
          <PrimaryButton onClick={goToNextRuleOrDialogue}>
            {hasNextRule ? t('rules_next') : t('rules_go_dialogue')}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div className={styles.actions}>
        {secondaryVisible ? (
          <PrimaryButton styleType="ghost" onClick={goBackStep}>
            {t('back')}
          </PrimaryButton>
        ) : null}
        <PrimaryButton onClick={() => void goNextStep()}>
          {t('rules_next')}
        </PrimaryButton>
      </div>
    );
  };

  return (
    <AppShell title={t('rules')} subtitle={t('practice_steps')}>
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

        {!loading && !error && items.length === 0 ? (
          <RoundedCard>
            <EmptyState
              title={t('no_tasks_yet')}
              subtitle={t('section_empty')}
            />
          </RoundedCard>
        ) : null}

        {!loading && !error && currentItem ? (
          <RoundedCard>
            <div className={styles.rulePicker}>
              <p className={styles.rulePickerTitle}>{t('rules_all_title')}</p>
              <div className={styles.rulePickerScroll}>
                {items.map((item, index) => {
                  const isActive = index === ruleIndex;
                  const statusClass =
                    item.status === 'known'
                      ? styles.ruleChipStatusKnown
                      : item.status === 'learning'
                        ? styles.ruleChipStatusLearning
                        : styles.ruleChipStatusNew;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.ruleChip}${isActive ? ` ${styles.ruleChipActive}` : ''}`}
                      onClick={() => onSelectRule(index)}
                      aria-label={`${t('rules_open_label')} ${index + 1}`}
                    >
                      <span className={styles.ruleChipText}>
                        {index + 1}.{' '}
                        {item.title || `${t('rules_rule_label')} ${index + 1}`}
                      </span>
                      <span
                        className={`${styles.ruleChipStatus} ${statusClass}`}
                      >
                        {t(item.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </RoundedCard>
        ) : null}

        {!loading && !error && currentItem ? (
          <RoundedCard>
            <div className={styles.progressHead}>
              <span className={styles.progressLabel}>
                {t('rules_rule_label')} {ruleIndex + 1}/{items.length}
              </span>
              <span className={styles.progressLabel}>
                {t('rules_step_label')} {stepIndex + 1}/{TOTAL_STEPS}
              </span>
            </div>
            <ProgressBar value={((stepIndex + 1) / TOTAL_STEPS) * 100} />
            {practicePassed ? (
              <p className={styles.successFlag}>{t('rules_correct')}</p>
            ) : null}
          </RoundedCard>
        ) : null}

        {!loading && !error && currentItem ? renderCurrentStep() : null}

        {!loading && !error && currentItem ? renderActions() : null}
      </div>
    </AppShell>
  );
};
