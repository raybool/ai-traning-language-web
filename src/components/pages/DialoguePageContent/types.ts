import type { LessonItemStatus } from '@/lib/api';

export type TDialoguePageContentProps = {
  lessonId: number;
};

export type TUiLine = {
  role: 'assistant' | 'student';
  text: string;
  hint?: string;
  feedback?: string;
};

export type TScriptTurn = {
  speaker: 'A' | 'B';
  text: string;
};

export type TDialogueMode = 'script' | 'ai';

export type TDialogueItemStatus = Extract<
  LessonItemStatus,
  'learning' | 'known'
>;
