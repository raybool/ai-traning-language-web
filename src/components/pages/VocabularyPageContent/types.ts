import type { LessonItemStatus } from '@/lib/api';

export type VocabularyCard = {
  id: number;
  status: LessonItemStatus;
  word: string;
  translate: string;
  example: string;
};

export type TVocabularyPageContentProps = {
  lessonId: number;
};
