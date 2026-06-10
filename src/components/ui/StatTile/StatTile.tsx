import cn from 'classnames';
import { FC } from 'react';

import styles from './StatTile.module.scss';
import { StatTileProps } from './types';

export const StatTile: FC<StatTileProps> = ({ label, value }) => (
  <div className={styles.tile}>
    <div className={cn('muted', styles.label)}>{label}</div>
    <div className={styles.value}>{value}</div>
  </div>
);
