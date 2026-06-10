import { ButtonProps } from 'antd';
import { ReactNode } from 'react';

export type RoundedButtonProps = ButtonProps & {
  children: ReactNode;
  className?: string;
};
