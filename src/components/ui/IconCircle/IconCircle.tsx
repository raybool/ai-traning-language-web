import { FC } from 'react';

import styles from './IconCircle.module.scss';
import { IconCircleProps } from './types';

export const IconCircle: FC<IconCircleProps> = ({
  icon,
  color = 'var(--primary-2)',
}) => (
  <div className={styles.icon} style={{ ['--icon-color' as string]: color }}>
    {icon}
  </div>
);
