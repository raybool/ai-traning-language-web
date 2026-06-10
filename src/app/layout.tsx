import '@/src/styles/global.scss';
import Script from 'next/script';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';

export const metadata = {
  title: process.env.NEXT_PUBLIC_WEBAPP_NAME || 'WebApp',
  description: 'Telegram Mini App',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
