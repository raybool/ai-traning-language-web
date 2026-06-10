import cn from 'classnames';
import { FC } from 'react';

import styles from './TopBar.module.scss';
import { TopBarProps } from './types';

export const TopBar: FC<TopBarProps> = ({ title, right }) => (
  <div className={cn('row', styles.container)}>
    <h2 className={styles.title}>{title}</h2>

    {right}
  </div>
);
