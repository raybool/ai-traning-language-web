import cn from 'classnames';
import { FC } from 'react';

import styles from './CategoryChip.module.scss';
import { CategoryChipType } from './types';

const dotClass = {
  grammar: styles.dotGrammar,
  vocabulary: styles.dotVocabulary,
  dialogues: styles.dotDialogues,
  listening: styles.dotListening,
};

export const CategoryChip: FC<CategoryChipType> = ({ label, type }) => (
  <span className={cn(styles.chip, styles[type])}>
    <span className={cn('badge-dot', dotClass[type])} />

    {label}
  </span>
);
