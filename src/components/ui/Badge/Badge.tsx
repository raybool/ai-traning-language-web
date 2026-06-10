import cn from 'classnames';
import { FC } from 'react';

import styles from './Badge.module.scss';
import { BadgeProps } from './types';

export const Badge: FC<BadgeProps> = ({ children, tone = 'neutral' }) => (
  <span className={cn(styles.badge, styles[tone])}>{children}</span>
);
