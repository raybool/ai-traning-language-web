import { FC } from 'react';

import styles from './SkillMasteryMap.module.scss';
import type { TSkillMasteryMapProps } from './types';

export const SkillMasteryMap: FC<TSkillMasteryMapProps> = ({ values }) => {
  return (
    <div className={styles.container}>
      {values.map((entry) => (
        <div key={entry.label}>
          <div className={`row ${styles.rowHeader}`}>
            <span>{entry.label}</span>
            <strong>{entry.value}%</strong>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{
                ['--skill-width' as string]: `${entry.value}%`,
                ['--skill-color' as string]: entry.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
