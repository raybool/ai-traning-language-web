import { FC } from 'react';

import styles from './SkeletonBlock.module.scss';
import { SkeletonBlockProps } from './types';

export const SkeletonBlock: FC<SkeletonBlockProps> = ({ height = 72 }) => (
  <div
    className={styles.skeleton}
    style={{ ['--skeleton-height' as string]: `${height}px` }}
  />
);
