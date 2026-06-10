import type { SubscriptionPlan } from '@/src/lib/api';

export const isFeaturedPlan = (plan: SubscriptionPlan): boolean =>
  plan.code === 'yearly' || plan.durationDays >= 365;
