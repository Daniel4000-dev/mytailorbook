import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider, THEME_ANTI_FLASH_SCRIPT } from '@/contexts/ThemeContext';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar/ServiceWorkerRegistrar';
import { inter, fraunces, manrope } from '@/lib/fonts';
import { APP_CONFIG } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${APP_CONFIG.domain}`),
  title: `${APP_CONFIG.name} — Fashion Studio Workspace`,
  description:
    'Premium workspace for managing orders, production, and clients in your fashion design studio.',
  // Almost every route here is either auth-gated or a private-by-link
  // customer page (tracking/receipt) — default to noindex and let the
  // few genuinely public pages (portfolio, privacy) opt back in
  // explicitly via their own metadata/generateMetadata.
  robots: { index: false, follow: false },
  openGraph: {
    siteName: APP_CONFIG.name,
    type: 'website',
    locale: APP_CONFIG.locale.replace('-', '_'),
    images: [{ url: '/images/logo-full.png', width: 760, height: 530 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_CONFIG.name,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F8FE' },
    { media: '(prefers-color-scheme: dark)', color: '#131220' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${manrope.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter, Fraunces, and Manrope are self-hosted via next/font/google
            (see lib/fonts.ts) — no more third-party round-trip for those.
            Playfair Display and Poppins are NOT loaded here: they're used
            exclusively by the "Editorial" public portfolio template, so
            they're loaded scoped to that component instead of app-wide
            (see EditorialTemplate.tsx) — every other page, including the
            in-app dashboard, no longer downloads fonts it never renders. */}
        {/* display=block (not swap) — this is an icon ligature font, so the
            fallback-font render during load is a raw word like "dashboard",
            not readable text worth showing early. A brief blank icon beats
            a flash of clipped text. */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        {/* Sets data-theme before first paint if the user has forced a
            theme — otherwise they'd see a flash of the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_ANTI_FLASH_SCRIPT }} />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
