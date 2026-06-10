import { Button } from 'antd';
import type { ButtonType } from 'antd/es/button';
import { FC } from 'react';

import type { PrimaryButtonProps, PrimaryButtonStyleType } from './types';

const styleRecord: Record<PrimaryButtonStyleType, ButtonType> = {
  solid: 'primary',
  ghost: 'default',
};

export const PrimaryButton: FC<PrimaryButtonProps> = ({
  children,
  styleType = 'solid',
  ...props
}) => (
  <Button type={styleRecord[styleType]} {...props}>
    {children}
  </Button>
);
