import type { RootState } from '../index';

export const selectAppBootstrap = (state: RootState) => state.appBootstrap;
export const selectLessons = (state: RootState) => state.appBootstrap.lessons;
export const selectCurrentLesson = (state: RootState) =>
  state.appBootstrap.currentLesson;
export const selectCurrentCourseId = (state: RootState) =>
  state.appBootstrap.currentCourseId;
export const selectSubscription = (state: RootState) =>
  state.appBootstrap.subscription;
export const selectProgressSummary = (state: RootState) =>
  state.appBootstrap.progressSummary;
export const selectCourseProgressSummary = (state: RootState) =>
  state.appBootstrap.courseProgressSummary;
export const selectSubscriptionRequired = (state: RootState) =>
  state.appBootstrap.subscriptionRequired;
