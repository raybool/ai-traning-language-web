import { logger } from './logger';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 10000;
const COURSE_CREATION_TIMEOUT_MS = 30000;
const CHAT_REQUEST_TIMEOUT_MS = 70000;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type AccountBlockedPayload = {
  code?: string;
  blockedUntil?: string;
  support?: string;
  supportUrl?: string | null;
};

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    logger.info('Making API request', {
      url,
      method: init?.method || 'GET',
    });
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    logger.error('API request failed', {
      url,
      method: init?.method || 'GET',
      error: error instanceof Error ? error.message : String(error),
      errorObject: error instanceof Error ? error : undefined,
    });
    if ((error as Error).name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function parseErrorResponse(
  fallbackMessage: string,
  res: Response
): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  let message = `${fallbackMessage}: HTTP ${res.status}`;
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const payloadMessage = (payload as { message?: unknown }).message;
    if (typeof payloadMessage === 'string') {
      message = payloadMessage;
    } else if (
      Array.isArray(payloadMessage) &&
      payloadMessage.every((part) => typeof part === 'string')
    ) {
      message = payloadMessage.join(', ');
    }
  }

  if (
    typeof window !== 'undefined' &&
    res.status === 423 &&
    payload &&
    typeof payload === 'object' &&
    (payload as AccountBlockedPayload).code === 'ACCOUNT_BLOCKED'
  ) {
    const blockedUntil = (payload as AccountBlockedPayload).blockedUntil ?? '';
    const support = (payload as AccountBlockedPayload).support ?? '';
    const supportUrl = (payload as AccountBlockedPayload).supportUrl ?? '';
    const params = new URLSearchParams();
    if (blockedUntil) {
      params.set('blockedUntil', blockedUntil);
    }
    if (support) {
      params.set('support', support);
    }
    if (supportUrl) {
      params.set('supportUrl', supportUrl);
    }
    const nextPath = params.toString()
      ? `/blocked?${params.toString()}`
      : '/blocked';
    if (!window.location.pathname.startsWith('/blocked')) {
      window.location.assign(nextPath);
    }
  }

  return new ApiError(message, res.status, payload);
}

export type TelegramAuthResponse = {
  accessToken: string;
  expiresIn: number;
  user: {
    id: number;
    telegramId: number;
    languageCode: string | null;
  };
};

export type UserByTelegram = {
  id: number;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  goal?: 'work' | 'travel' | 'interviews' | 'from_scratch' | null;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | null;
  dailyMinutes?: number | null;
  focusSkill?: 'speaking' | 'vocabulary' | 'grammar' | 'listening' | null;
  onboardingCompletedAt?: string | null;
  firstAiMessageAt?: string | null;
  wowLessonCompletedAt?: string | null;
  currentCourseId?: number | null;
};

export type OnboardingWord = {
  term: string;
  translate: string;
  example: string;
};

export type OnboardingRule = {
  title: string;
  explanation: string;
  example: string;
};

export type OnboardingDialogue = {
  title: string;
  scenario: string;
  assistantOpening: string;
  suggestedReply: string;
  goal: string;
};

export type OnboardingLesson = {
  key: string;
  goal: 'work' | 'travel' | 'interviews' | 'from_scratch';
  level: 'A1' | 'A2' | 'B1' | 'B2';
  focusSkill: 'speaking' | 'vocabulary' | 'grammar' | 'listening';
  title: string;
  subtitle: string;
  words: [OnboardingWord, OnboardingWord, OnboardingWord];
  rule: OnboardingRule;
  dialogue: OnboardingDialogue;
  nextStep: string;
};

export type Course = {
  id: number;
  title: string;
  userId: number;
  progress: number;
  plan: Record<string, unknown>;
  lastCompletedTopic?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourseTemplate = {
  id: number;
  title: string;
  level: string;
  durationWeeks: number;
  plan: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LessonListItem = {
  id: number;
  courseId: number;
  blockIndex: number;
  progress: number;
  status: 'generating' | 'in_progress' | 'completed' | 'failed';
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LessonSectionType = 'rules' | 'words' | 'dialogues' | 'listening';

export type LessonItemStatus = 'new' | 'learning' | 'known';

export type LessonItem = {
  id: number;
  sectionId: number;
  status: LessonItemStatus;
  title: string;
  content: Record<string, unknown>;
  translate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LessonEvent = {
  id: number;
  telegramId: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SubscriptionPlan = {
  id: number;
  code: string;
  title: string;
  description: string;
  currency: string;
  price: number;
  durationDays: number;
  isActive: boolean;
  purchaseUrl: string | null;
};

export type MySubscription = {
  title: string | null;
  status: 'free' | 'active' | 'expired';
  planCode: string | null;
  autoRenew: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
  paymentProvider: 'telegram' | 'yookassa' | null;
  hasSavedPaymentMethod: boolean;
  canCancel: boolean;
  canManagePaymentMethods: boolean;
  defaultPaymentMethodId: string | null;
};

export type SubscriptionCheckout = {
  paymentId: string;
  status:
    | 'pending'
    | 'waiting_for_capture'
    | 'succeeded'
    | 'canceled'
    | 'card_saved_refund_pending'
    | 'card_saved_refund_succeeded'
    | 'card_saved_refund_failed';
  confirmationUrl: string | null;
};

export type SubscriptionPaymentStatus = {
  paymentId: string;
  planCode: string | null;
  status:
    | 'pending'
    | 'waiting_for_capture'
    | 'succeeded'
    | 'canceled'
    | 'card_saved_refund_pending'
    | 'card_saved_refund_succeeded'
    | 'card_saved_refund_failed';
  subscriptionActivated: boolean;
  purpose:
    | 'subscription_checkout'
    | 'recurring'
    | 'bind_payment_method'
    | 'telegram';
};

export type SubscriptionPaymentMethod = {
  id: number;
  provider: 'telegram' | 'yookassa';
  brand: string | null;
  last4: string | null;
  title: string | null;
  isDefault: boolean;
  isActive: boolean;
  boundAt: string | null;
};

export type DialogueChatSession = {
  sessionId: string;
  lessonId: number | null;
  itemId: number | null;
  contextType: 'lesson' | 'onboarding';
  onboardingLessonKey: string | null;
  status: 'active' | 'closed';
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
};

export type DialogueChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  text: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type DialogueModeration = {
  offTopic: boolean;
  action: 'redirect_to_dialogue' | 'normal';
  reason: string;
  topicalScore: number;
  rewritten?: boolean;
};

export type ProgressSummaryDay = {
  date: string;
  completedItems: number;
  percent: number;
};

export type ProgressSkillMastery = {
  key: 'rules' | 'words' | 'dialogues' | 'listening';
  label: string;
  value: number;
};

export type ProgressAchievement = {
  key:
    | 'first_known_item'
    | 'first_completed_lesson'
    | 'known_20_items'
    | 'streak_7_days'
    | 'section_master_80';
  title: string;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
};

export type ProgressSummary = {
  scope: 'all' | 'current_course';
  currentCourseId: number | null;
  dailyTarget: number;
  completedItemsToday: number;
  dailyPercent: number;
  streakDays: number;
  last7Days: ProgressSummaryDay[];
  knownItems: number;
  learningItems: number;
  totalItems: number;
  completedLessons: number;
  totalLessons: number;
  xp: number;
  level: number;
  levelProgressPercent: number;
  levelXpCurrent: number;
  levelXpTarget: number;
  skillMastery: ProgressSkillMastery[];
  achievements: ProgressAchievement[];
};

export async function authByTelegram(
  initData: string
): Promise<TelegramAuthResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/webapp/auth/telegram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    throw await parseErrorResponse('Auth failed', res);
  }

  return (await res.json()) as TelegramAuthResponse;
}

export async function authDevWebapp(): Promise<TelegramAuthResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/webapp/auth/dev`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse('Dev auth failed', res);
  }

  return (await res.json()) as TelegramAuthResponse;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getWebappMe(accessToken: string): Promise<{
  userId: number;
  telegramId: number;
  scope: string;
  exp: number;
}> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/webapp/me`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /webapp/me failed', res);
  }
  return (await res.json()) as {
    userId: number;
    telegramId: number;
    scope: string;
    exp: number;
  };
}

export async function getCurrentUser(
  accessToken: string
): Promise<UserByTelegram> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /users/me failed', res);
  }
  return (await res.json()) as UserByTelegram;
}

export async function completeOnboarding(
  data: {
    goal: 'work' | 'travel' | 'interviews' | 'from_scratch';
    level: 'A1' | 'A2' | 'B1' | 'B2';
    dailyMinutes: number;
    focusSkill: 'speaking' | 'vocabulary' | 'grammar' | 'listening';
  },
  accessToken: string
): Promise<{
  user: UserByTelegram;
  scenarioId: string;
  lesson: OnboardingLesson;
  nextPath: string;
}> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/users/me/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await parseErrorResponse('POST /users/me/onboarding/complete failed', res);
  }
  return (await res.json()) as {
    user: UserByTelegram;
    scenarioId: string;
    lesson: OnboardingLesson;
    nextPath: string;
  };
}

export async function getCurrentOnboardingLesson(
  accessToken: string
): Promise<OnboardingLesson> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/onboarding-lessons/current`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /onboarding-lessons/current failed', res);
  }
  return (await res.json()) as OnboardingLesson;
}

export async function completeOnboardingLesson(
  lessonKey: string,
  accessToken: string
): Promise<{ ok: true; user: UserByTelegram }> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/onboarding-lessons/${encodeURIComponent(lessonKey)}/complete`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'POST /onboarding-lessons/:lessonKey/complete failed',
      res
    );
  }
  return (await res.json()) as { ok: true; user: UserByTelegram };
}

export async function getLessons(
  courseId: number,
  accessToken: string
): Promise<LessonListItem[]> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/lessons?courseId=${courseId}`,
    {
      method: 'GET',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse('GET /lessons failed', res);
  }
  return (await res.json()) as LessonListItem[];
}

export async function getProgressSummary(
  timeZone: string,
  accessToken: string,
  scope: 'all' | 'current_course' = 'all'
): Promise<ProgressSummary> {
  const params = new URLSearchParams({ tz: timeZone, scope });
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/progress/summary?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );

  if (!res.ok) {
    throw await parseErrorResponse('GET /progress/summary failed', res);
  }

  return (await res.json()) as ProgressSummary;
}

export async function getAllCourses(accessToken: string): Promise<Course[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/courses`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /courses failed', res);
  }
  return (await res.json()) as Course[];
}

export async function getCourseTemplates(
  accessToken: string
): Promise<CourseTemplate[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/course-templates`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /course-templates failed', res);
  }
  return (await res.json()) as CourseTemplate[];
}

export async function createCourseFromTemplate(
  data: { templateId: number },
  accessToken: string
): Promise<Course> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/courses/from-template`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify(data),
    },
    COURSE_CREATION_TIMEOUT_MS
  );
  if (!res.ok) {
    throw await parseErrorResponse('POST /courses/from-template failed', res);
  }
  return (await res.json()) as Course;
}

export async function createCourseFromOnboarding(
  accessToken: string
): Promise<Course> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/courses/from-onboarding`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
    },
  }, COURSE_CREATION_TIMEOUT_MS);
  if (!res.ok) {
    throw await parseErrorResponse('POST /courses/from-onboarding failed', res);
  }
  return (await res.json()) as Course;
}

export async function setCurrentCourse(
  courseId: number,
  accessToken: string
): Promise<UserByTelegram> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/users/me/current-course`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify({ courseId }),
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'PATCH /users/me/current-course failed',
      res
    );
  }
  return (await res.json()) as UserByTelegram;
}

export async function getCurrentLesson(
  accessToken: string
): Promise<LessonListItem | null> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/lessons/current`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /lessons/current failed', res);
  }

  const payload = (await res.json()) as
    | { lesson: LessonListItem | null }
    | LessonListItem
    | null;

  if (payload && typeof payload === 'object' && 'lesson' in payload) {
    return payload.lesson;
  }

  return payload as LessonListItem | null;
}

export async function generateNextLesson(
  data: { courseId: number },
  accessToken: string
): Promise<{ ok: boolean; message: string; lessonId: number; taskId: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/lessons/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw await parseErrorResponse('POST /lessons/generate failed', res);
  }

  return (await res.json()) as {
    ok: boolean;
    message: string;
    lessonId: number;
    taskId: string;
  };
}

export async function getSubscriptionPlans(
  accessToken: string
): Promise<SubscriptionPlan[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscription-plans`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /subscription-plans failed', res);
  }
  return (await res.json()) as SubscriptionPlan[];
}

export async function getMySubscription(
  accessToken: string
): Promise<MySubscription> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/me`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /subscriptions/me failed', res);
  }
  return (await res.json()) as MySubscription;
}

export async function setAutoRenew(
  autoRenew: boolean,
  accessToken: string
): Promise<MySubscription> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/subscriptions/me/auto-renew`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify({ autoRenew }),
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'PATCH /subscriptions/me/auto-renew failed',
      res
    );
  }
  return (await res.json()) as MySubscription;
}

export async function cancelSubscription(
  accessToken: string
): Promise<MySubscription> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/me/cancel`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('POST /subscriptions/me/cancel failed', res);
  }
  return (await res.json()) as MySubscription;
}

export async function getSubscriptionPaymentMethods(
  accessToken: string
): Promise<SubscriptionPaymentMethod[]> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/subscriptions/me/payment-methods`,
    {
      method: 'GET',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'GET /subscriptions/me/payment-methods failed',
      res
    );
  }
  return (await res.json()) as SubscriptionPaymentMethod[];
}

export async function createPaymentMethodBindCheckout(
  accessToken: string
): Promise<SubscriptionCheckout> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/subscriptions/me/payment-methods/bind`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'POST /subscriptions/me/payment-methods/bind failed',
      res
    );
  }
  return (await res.json()) as SubscriptionCheckout;
}

export async function setDefaultSubscriptionPaymentMethod(
  paymentMethodId: number,
  accessToken: string
): Promise<{ ok: true }> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/subscriptions/me/payment-methods/${paymentMethodId}/set-default`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'POST /subscriptions/me/payment-methods/:id/set-default failed',
      res
    );
  }
  return (await res.json()) as { ok: true };
}

export async function deleteSubscriptionPaymentMethod(
  paymentMethodId: number,
  accessToken: string
): Promise<{
  ok: true;
  deletedKind: 'default' | 'additional';
  autoRenewDisabled: boolean;
}> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/subscriptions/me/payment-methods/${paymentMethodId}`,
    {
      method: 'DELETE',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'DELETE /subscriptions/me/payment-methods/:id failed',
      res
    );
  }
  return (await res.json()) as {
    ok: true;
    deletedKind: 'default' | 'additional';
    autoRenewDisabled: boolean;
  };
}

export async function createSubscriptionCheckout(
  planCode: string,
  accessToken: string
): Promise<SubscriptionCheckout> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify({ planCode }),
  });
  if (!res.ok) {
    throw await parseErrorResponse('POST /subscriptions/checkout failed', res);
  }
  return (await res.json()) as SubscriptionCheckout;
}

export async function getSubscriptionPaymentStatus(
  paymentId: string,
  accessToken: string
): Promise<SubscriptionPaymentStatus> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/subscriptions/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'GET /subscriptions/payments/:paymentId failed',
      res
    );
  }
  return (await res.json()) as SubscriptionPaymentStatus;
}

export async function pollEvents(accessToken: string): Promise<LessonEvent[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/events`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse('GET /events failed', res);
  }

  return (await res.json()) as LessonEvent[];
}

export async function getLessonById(
  lessonId: number,
  accessToken: string
): Promise<LessonListItem> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/lessons/${lessonId}`, {
    method: 'GET',
    headers: {
      ...authHeaders(accessToken),
    },
  });
  if (!res.ok) {
    throw await parseErrorResponse('GET /lessons/:id failed', res);
  }
  return (await res.json()) as LessonListItem;
}

export async function getLessonSectionItems(
  lessonId: number,
  type: LessonSectionType,
  accessToken: string
): Promise<LessonItem[]> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/lessons/${lessonId}/sections/${type}`,
    {
      method: 'GET',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'GET /lessons/:id/sections/:type failed',
      res
    );
  }
  return (await res.json()) as LessonItem[];
}

export async function updateLessonItemStatus(
  lessonId: number,
  itemId: number,
  status: LessonItemStatus,
  accessToken: string
): Promise<LessonListItem> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/lessons/${lessonId}/items/${itemId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    throw await parseErrorResponse(
      'PATCH /lessons/:id/items/:itemId/status failed',
      res
    );
  }
  return (await res.json()) as LessonListItem;
}

export async function createDialogueChatSession(
  data: {
    lessonId?: number;
    itemId?: number;
    onboardingLessonKey?: string;
  },
  accessToken: string
): Promise<DialogueChatSession> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/dialogue-chat/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw await parseErrorResponse('POST /dialogue-chat/sessions failed', res);
  }

  return (await res.json()) as DialogueChatSession;
}

export async function getDialogueChatMessages(
  sessionId: string,
  accessToken: string
): Promise<{ sessionId: string; messages: DialogueChatMessage[] }> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/dialogue-chat/sessions/${sessionId}/messages`,
    {
      method: 'GET',
      headers: {
        ...authHeaders(accessToken),
      },
    }
  );

  if (!res.ok) {
    throw await parseErrorResponse(
      'GET /dialogue-chat/sessions/:sessionId/messages failed',
      res
    );
  }

  return (await res.json()) as {
    sessionId: string;
    messages: DialogueChatMessage[];
  };
}

export async function sendDialogueChatMessage(
  sessionId: string,
  text: string,
  accessToken: string
): Promise<{
  assistant: {
    text: string;
    feedback: string;
  };
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  safety?: {
    sanitized: boolean;
    notice: string | null;
    flags: string[];
  };
  security?: {
    injectionAttemptsTotal: number;
  };
  moderation?: DialogueModeration;
}> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/dialogue-chat/sessions/${sessionId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify({ text }),
    },
    CHAT_REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    throw await parseErrorResponse(
      'POST /dialogue-chat/sessions/:sessionId/messages failed',
      res
    );
  }

  return (await res.json()) as {
    assistant: { text: string; feedback: string };
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    safety?: { sanitized: boolean; notice: string | null; flags: string[] };
    security?: { injectionAttemptsTotal: number };
    moderation?: DialogueModeration;
  };
}
