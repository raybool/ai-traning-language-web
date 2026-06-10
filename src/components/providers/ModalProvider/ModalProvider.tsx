'use client';

import { Modal } from 'antd';
import { FC, createContext, useCallback, useMemo, useState } from 'react';

import { ProviderProps } from '../types';
import { ModalConfig, ModalContextValue } from './types';

export const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider: FC<ProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const close = useCallback(() => {
    setConfirmLoading(false);
    setConfig(null);
  }, []);

  const open = useCallback(
    (nextConfig: ModalConfig) => setConfig(nextConfig),
    []
  );

  const onCancel = useCallback(() => {
    try {
      config?.onCancel?.();
    } catch (error) {
      console.error('Modal onCancel failed', error);
    } finally {
      close();
    }
  }, [close, config]);

  const onOk = useCallback(async () => {
    if (!config?.onOk) {
      close();
      return;
    }

    try {
      setConfirmLoading(true);
      await config.onOk();
      close();
    } catch (error) {
      setConfirmLoading(false);
      console.error('Modal onOk failed', error);
    }
  }, [close, config]);

  const value = useMemo<ModalContextValue>(
    () => ({
      open,
      close,
    }),
    [close, open]
  );

  const maskClosable = config?.mask?.closable ?? true;

  return (
    <ModalContext.Provider value={value}>
      {children}
      <Modal
        width={460}
        open={!!config}
        title={config?.title}
        onOk={() => void onOk()}
        onCancel={onCancel}
        okText={config?.okText}
        cancelText={config?.cancelText}
        confirmLoading={confirmLoading}
        okButtonProps={{ danger: Boolean(config?.danger) }}
        cancelButtonProps={{
          style: {
            display: config?.showCancel === false ? 'none' : undefined,
          },
        }}
        mask={{ closable: maskClosable }}
      >
        {config?.content}
      </Modal>
    </ModalContext.Provider>
  );
};
