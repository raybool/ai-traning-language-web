import cn from 'classnames';
import { FC } from 'react';

import styles from './RoundedCard.module.scss';
import { RoundedCardProps } from './types';

export const RoundedCard: FC<RoundedCardProps> = ({ children, className }) => (
  <section className={cn(styles.card, className)}>{children}</section>
);
