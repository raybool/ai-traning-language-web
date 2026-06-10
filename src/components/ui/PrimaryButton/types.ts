import type { ButtonProps } from 'antd/es/button/Button';
import type { ReactNode } from 'react';

export type PrimaryButtonStyleType = 'solid' | 'ghost';

export type PrimaryButtonProps = ButtonProps & {
  children: ReactNode;
  styleType?: PrimaryButtonStyleType;
};
