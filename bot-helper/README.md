# bot-helper

Helper для Telegram Bot кнопки, открывающей Mini App.

## Example

```ts
import { buildMiniAppButton, getMiniAppUrl } from './index';

const webAppUrl = getMiniAppUrl(process.env.WEBAPP_URL!, { source: 'bot' });
const replyMarkup = buildMiniAppButton({
  text: 'Open WebApp',
  webAppUrl,
});

// Telegraf:
// await ctx.reply('Open app', { reply_markup: replyMarkup });
```
