import type {
  TOnboardingDailyMinutes,
  TOnboardingFocus,
  TOnboardingGoal,
  TOnboardingLevel,
} from './types';

export const ONBOARDING_STEPS = [0, 1, 2, 3] as const;
export const ONBOARDING_GOAL_OPTIONS: readonly TOnboardingGoal[] = [
  'work',
  'travel',
  'interviews',
  'from_scratch',
];
export const ONBOARDING_LEVEL_OPTIONS: readonly TOnboardingLevel[] = [
  'A1',
  'A2',
  'B1',
  'B2',
];
export const ONBOARDING_DAILY_MINUTES_OPTIONS: readonly TOnboardingDailyMinutes[] =
  [10, 20, 30, 45];
export const ONBOARDING_FOCUS_OPTIONS: readonly TOnboardingFocus[] = [
  'speaking',
  'vocabulary',
  'grammar',
  'listening',
];
