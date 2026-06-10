'use client';

import { useCallback, useRef, useState } from 'react';

import { pollEvents } from '../lib/api';

export type GenerationState = 'idle' | 'pending' | 'completed' | 'failed';

const generationErrorMap: Record<string, string> = {
  LISTENING_AUDIO_SYNTHESIS_FAILED:
    'Ошибка аудирования: не удалось синтезировать аудио.',
  LISTENING_AUDIO_CONCAT_FAILED:
    'Ошибка аудирования: не удалось собрать аудиодорожку.',
  LISTENING_AUDIO_UPLOAD_FAILED:
    'Ошибка аудирования: не удалось загрузить аудиодорожку в хранилище.',
  LISTENING_SEGMENTS_INVALID:
    'Ошибка аудирования: сегменты или таймкоды аудиодорожки невалидны.',
};

function mapGenerationError(value: unknown): string {
  const code = String(value ?? '');
  return generationErrorMap[code] ?? (code || 'Генерация завершилась ошибкой');
}

export type GenerationFailedPayload = {
  courseDeleted?: boolean;
  courseId?: number;
  code?: string;
  error?: string;
};

export function useGenerationPolling() {
  const [state, setState] = useState<GenerationState>('idle');
  const timeoutRef = useRef<number | null>(null);
  const startedRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(
    (
      accessToken: string,
      handlers: {
        onCompleted: () => Promise<void> | void;
        onFailed: (message: string, payload?: GenerationFailedPayload) => void;
      }
    ) => {
      stop();
      setState('pending');
      startedRef.current = Date.now();

      const tick = async () => {
        if (Date.now() - startedRef.current > 15 * 60 * 1000) {
          setState('failed');
          handlers.onFailed('Превышено время ожидания генерации урока');
          stop();
          return;
        }

        try {
          const events = await pollEvents(accessToken);
          const completed = events.find(
            (e) => e.type === 'lesson_generation_completed'
          );
          const failed = events.find(
            (e) => e.type === 'lesson_generation_failed'
          );

          if (completed) {
            await handlers.onCompleted();
            setState('completed');
            stop();
            return;
          }
          if (failed) {
            setState('failed');
            handlers.onFailed(
              mapGenerationError(failed.payload?.error),
              failed.payload as GenerationFailedPayload,
            );
            stop();
            return;
          }
        } catch {
          // transient network errors ignored
        }

        const delay = 5000 + Math.floor(Math.random() * 1000);
        timeoutRef.current = window.setTimeout(() => {
          void tick();
        }, delay);
      };

      void tick();
    },
    [stop]
  );

  return { state, setState, start, stop };
}
