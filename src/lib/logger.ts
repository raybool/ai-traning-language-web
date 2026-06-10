// src/shared/lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  level: LogLevel;
  message: string;
  data?: unknown;
  url?: string;
  userAgent?: string;
  timestamp?: string;
};

const sendRemoteLog = async (payload: LogPayload) => {
  try {
    await fetch('/appi/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Failed to send remote log', e);
  }
};

export const logger = {
  info(message: string, data?: unknown) {
    console.log('[INFO]', message, data);

    void sendRemoteLog({
      level: 'info',
      message,
      data,
      // url: window.location.href,
      // userAgent: navigator.userAgent,
      // timestamp: new Date().toISOString(),
    });
  },

  warn(message: string, data?: unknown) {
    console.warn('[WARN]', message, data);

    void sendRemoteLog({
      level: 'warn',
      message,
      data,
      // url: window.location.href,
      // userAgent: navigator.userAgent,
      // timestamp: new Date().toISOString(),
    });
  },

  error(message: string, data?: unknown) {
    console.error('[ERROR]', message, data);

    void sendRemoteLog({
      level: 'error',
      message,
      data,
      // url: window.location.href,
      // userAgent: navigator.userAgent,
      // timestamp: new Date().toISOString(),
    });
  },
};
