import { ReactNode } from 'react';

export type BadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
};
