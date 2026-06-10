'use client';

import { useCallback, useState } from 'react';

import {
  LessonItem,
  LessonItemStatus,
  LessonSectionType,
  getLessonSectionItems,
  updateLessonItemStatus,
} from '../lib/api';

export function useLessonSections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<LessonItem[]>([]);

  const load = useCallback(
    async (
      lessonId: number,
      section: LessonSectionType,
      accessToken: string
    ) => {
      setLoading(true);
      setError('');
      try {
        const data = await getLessonSectionItems(
          lessonId,
          section,
          accessToken
        );
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load section');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const setStatus = useCallback(
    async (
      lessonId: number,
      itemId: number,
      status: LessonItemStatus,
      accessToken: string
    ) => {
      await updateLessonItemStatus(
        lessonId,
        itemId,
        status,
        accessToken
      );
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, status } : it))
      );
    },
    []
  );

  return { loading, error, items, load, setStatus };
}
