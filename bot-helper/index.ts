export type MiniAppButtonParams = {
  text: string;
  webAppUrl: string;
};

export function getMiniAppUrl(
  baseUrl: string,
  params?: Record<string, string | number | boolean>
): string {
  const url = new URL(baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

export function buildMiniAppButton({ text, webAppUrl }: MiniAppButtonParams) {
  return {
    inline_keyboard: [[{ text, web_app: { url: webAppUrl } }]],
  };
}
