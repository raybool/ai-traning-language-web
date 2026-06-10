import type { LessonItem } from '@/lib/api';

import type { TScriptTurn } from '../types';

export function getItemText(item: LessonItem): string {
  return typeof item.content?.text === 'string'
    ? String(item.content.text)
    : item.title;
}

export function parseScriptTurns(raw: string): TScriptTurn[] {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) {
    return [];
  }

  const markers = Array.from(text.matchAll(/([AB]):/g));
  if (markers.length < 2) {
    return [];
  }

  const turns: TScriptTurn[] = [];
  for (let idx = 0; idx < markers.length; idx += 1) {
    const marker = markers[idx];
    const speaker = marker[1] as 'A' | 'B';
    const start = (marker.index ?? 0) + marker[0].length;
    const end =
      idx + 1 < markers.length
        ? (markers[idx + 1].index ?? text.length)
        : text.length;
    const value = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (!value) {
      continue;
    }
    turns.push({ speaker, text: value });
  }

  return turns;
}

function normalizeForMatch(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function overlapScore(a: string, b: string): number {
  const aTokens = normalizeForMatch(a);
  const bTokens = normalizeForMatch(b);
  if (!aTokens.length || !bTokens.length) {
    return 0;
  }

  const bSet = new Set(bTokens);
  let matchCount = 0;
  for (const token of aTokens) {
    if (bSet.has(token)) {
      matchCount += 1;
    }
  }

  return matchCount / bTokens.length;
}

export function createLocalId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
