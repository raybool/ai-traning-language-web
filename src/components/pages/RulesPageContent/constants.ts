import type { TRuleViewState } from './types';

export const TOTAL_STEPS = 6;
export const PRACTICE_STEP_INDEX = 4;
export const SUMMARY_STEP_INDEX = 5;

export const DEFAULT_RULE_VIEW_STATE: TRuleViewState = {
  stepIndex: 0,
  practiceIndex: 0,
  practicePassed: false,
};
