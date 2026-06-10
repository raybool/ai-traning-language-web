import { FC } from 'react';

import { RoundedCard } from '../RoundedCard';
import styles from './EmptyState.module.scss';
import { EmptyStateProps } from './types';

export const EmptyState: FC<EmptyStateProps> = ({ title, subtitle }) => (
  <RoundedCard className={styles.container}>
    <p className={styles.title}>{title}</p>
    <p className={styles.subtitle}>{subtitle}</p>
  </RoundedCard>
);
