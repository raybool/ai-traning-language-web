import type { ReactNode } from 'react';

export type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  withoutBack?: boolean;
};
