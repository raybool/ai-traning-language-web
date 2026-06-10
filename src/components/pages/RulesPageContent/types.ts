import type { LessonItemStatus } from '@/lib/api';

export type TRulesPageContentProps = {
  lessonId: number;
};

export type TRuleFlow = {
  essence: {
    title: string;
    description: string;
  };
  formula: {
    patterns: Array<{
      template: string;
      hint: string;
    }>;
  };
  examples: Array<{
    text: string;
    translate: string;
  }>;
  mistake: {
    wrong: string;
    correct: string;
    explanation: string;
  };
  practice: Array<{
    type: 'single_choice';
    question: string;
    options: string[];
    correctIndex: number;
    successFeedback: string;
    errorFeedback: string;
  }>;
  summary: {
    bullets: string[];
  };
};

export type TRuleViewState = {
  stepIndex: number;
  practiceIndex: number;
  practicePassed: boolean;
};

export type TRulePracticeFeedbackType = 'success' | 'error' | null;

export type TRuleItemStatus = Extract<LessonItemStatus, 'learning' | 'known'>;
