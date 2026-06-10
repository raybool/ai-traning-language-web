export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: Record<string, unknown> & {
    user?: { language_code?: string };
  };
  ready: () => void;
  expand: () => void;
  openLink?: (
    url: string,
    options?: {
      try_browser?: boolean;
      try_instant_view?: boolean;
    }
  ) => void;
  colorScheme?: string;
  themeParams?: Record<string, string>;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const w = window as TelegramWindow;
  return w.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp(): TelegramWebApp | null {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return null;
  }
  webApp.ready();
  webApp.expand();
  return webApp;
}

export function openTelegramExternalLink(url: string): void {
  const webApp = getTelegramWebApp();
  if (webApp?.openLink) {
    webApp.openLink(url, { try_browser: true });
    return;
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(url);
  }
}
