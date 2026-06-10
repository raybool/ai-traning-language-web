import type { LessonItem } from '@/lib/api';

import type { TRuleFlow } from '../types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidRuleFlow(value: unknown): value is TRuleFlow {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const flow = value as Record<string, unknown>;
  const essence = flow.essence as Record<string, unknown> | undefined;
  const formula = flow.formula as Record<string, unknown> | undefined;
  const mistake = flow.mistake as Record<string, unknown> | undefined;
  const summary = flow.summary as Record<string, unknown> | undefined;

  if (
    !essence ||
    !isNonEmptyString(essence.title) ||
    !isNonEmptyString(essence.description)
  ) {
    return false;
  }

  if (
    !formula ||
    !Array.isArray(formula.patterns) ||
    formula.patterns.length === 0 ||
    !formula.patterns.every((entry) => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }
      const pattern = entry as Record<string, unknown>;
      return (
        isNonEmptyString(pattern.template) && isNonEmptyString(pattern.hint)
      );
    })
  ) {
    return false;
  }

  if (
    !Array.isArray(flow.examples) ||
    flow.examples.length === 0 ||
    !flow.examples.every((entry) => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }
      const example = entry as Record<string, unknown>;
      return (
        isNonEmptyString(example.text) && typeof example.translate === 'string'
      );
    })
  ) {
    return false;
  }

  if (
    !mistake ||
    !isNonEmptyString(mistake.wrong) ||
    !isNonEmptyString(mistake.correct) ||
    !isNonEmptyString(mistake.explanation)
  ) {
    return false;
  }

  if (
    !Array.isArray(flow.practice) ||
    flow.practice.length === 0 ||
    !flow.practice.every((entry) => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }
      const practice = entry as Record<string, unknown>;
      if (
        practice.type !== 'single_choice' ||
        !isNonEmptyString(practice.question)
      ) {
        return false;
      }
      if (
        !Array.isArray(practice.options) ||
        practice.options.length < 2 ||
        !practice.options.every((option) => isNonEmptyString(option))
      ) {
        return false;
      }
      if (
        typeof practice.correctIndex !== 'number' ||
        !Number.isInteger(practice.correctIndex) ||
        practice.correctIndex < 0 ||
        practice.correctIndex >= practice.options.length
      ) {
        return false;
      }
      return (
        isNonEmptyString(practice.successFeedback) &&
        isNonEmptyString(practice.errorFeedback)
      );
    })
  ) {
    return false;
  }

  if (
    !summary ||
    !Array.isArray(summary.bullets) ||
    summary.bullets.length === 0 ||
    !summary.bullets.every((bullet) => isNonEmptyString(bullet))
  ) {
    return false;
  }

  return true;
}

export function extractRuleFlow(item: LessonItem | null): TRuleFlow | null {
  if (!item) {
    return null;
  }
  const flow = (item.content as Record<string, unknown>).ruleFlow;
  return isValidRuleFlow(flow) ? flow : null;
}
