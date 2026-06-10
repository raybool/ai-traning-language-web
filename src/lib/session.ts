import { authByTelegram, authDevWebapp } from './api';
import { logger } from './logger';
import { getTelegramWebApp } from './telegram';

const SESSION_KEY = 'webapp_session';

type SessionData = {
  accessToken: string;
  telegramId: number;
  expiresAt: number;
};

let inMemorySession: SessionData | null = null;
const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_WEBAPP_DEV_AUTH === 'true';

function readSessionStorage(): SessionData | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

function writeSessionStorage(data: SessionData): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function isValid(data: SessionData | null): data is SessionData {
  if (!data) {
    return false;
  }
  return Date.now() < data.expiresAt;
}

export async function ensureWebappSession(): Promise<{
  accessToken: string;
  telegramId: number;
}> {
  if (isValid(inMemorySession)) {
    return {
      accessToken: inMemorySession.accessToken,
      telegramId: inMemorySession.telegramId,
    };
  }

  const stored = readSessionStorage();
  if (isValid(stored)) {
    inMemorySession = stored;
    return { accessToken: stored.accessToken, telegramId: stored.telegramId };
  }

  const webApp = getTelegramWebApp();
  let auth;
  if (webApp?.initData) {
    auth = await authByTelegram(webApp.initData);
  } else if (DEV_AUTH_ENABLED) {
    auth = await authDevWebapp();
  } else {
    throw new Error('Telegram WebApp initData is missing');
  }
  const sessionData: SessionData = {
    accessToken: auth.accessToken,
    telegramId: auth.user.telegramId,
    expiresAt: Date.now() + auth.expiresIn * 1000,
  };
  inMemorySession = sessionData;
  writeSessionStorage(sessionData);
  return {
    accessToken: sessionData.accessToken,
    telegramId: sessionData.telegramId,
  };
}
