import type { ProgressSkillMastery } from '@/src/lib/api';

export const SKILL_COLORS: Record<ProgressSkillMastery['key'], string> = {
  rules: 'var(--cat-grammar)',
  words: 'var(--cat-vocab)',
  dialogues: 'var(--cat-dialogue)',
  listening: 'var(--cat-listening)',
};
