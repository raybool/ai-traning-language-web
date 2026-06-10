import { FC } from 'react';

import styles from './ProgressBar.module.scss';
import { ProgressBarProps } from './types';

export const ProgressBar: FC<ProgressBarProps> = ({ value }) => {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className={styles.track}>
      <div
        className={styles.fill}
        style={{ ['--progress' as string]: `${safe}%` }}
      />
    </div>
  );
};
