import { ReactNode } from 'react';

export type ModalConfig = {
  title?: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  danger?: boolean;
  mask?: {
    closable?: boolean;
  };
};

export type ModalContextValue = {
  open: (config: ModalConfig) => void;
  close: () => void;
};
