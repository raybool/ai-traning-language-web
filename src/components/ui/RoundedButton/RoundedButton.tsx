import { Button } from 'antd';
import cn from 'classnames';
import React from 'react';

import styles from './RoundedButton.module.scss';
import { RoundedButtonProps } from './types';

export const RoundedButton: React.FC<RoundedButtonProps> = ({
  children,
  className,
  ...props
}) => (
  <Button {...props} className={cn(styles.card, className)}>
    {children}
  </Button>
);
