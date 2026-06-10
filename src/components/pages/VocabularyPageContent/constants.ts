import type { LessonItemStatus } from '@/lib/api';

import styles from './VocabularyPageContent.module.scss';

export const cardStyleByStatus: Record<
  LessonItemStatus,
  { style: string; tone: 'neutral' | 'warning' | 'success' }
> = {
  new: { style: styles.default, tone: 'neutral' },
  learning: { style: styles.pending, tone: 'warning' },
  known: { style: styles.achieved, tone: 'success' },
};
