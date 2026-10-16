import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider, THEME_ANTI_FLASH_SCRIPT } from '@/contexts/ThemeContext';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar/ServiceWorkerRegistrar';
import PressFeedback from '@/components/system/PressFeedback/PressFeedback';
import ReferralCapture from '@/components/system/ReferralCapture/ReferralCapture';
import AppSWRConfig from '@/components/pwa/AppSWRConfig/AppSWRConfig';
import NetworkMonitor from '@/components/pwa/NetworkMonitor/NetworkMonitor';
import AnalyticsProvider from '@/components/analytics/AnalyticsProvider';
import JsonLd from '@/components/seo/JsonLd';
import { inter, fraunces, manrope } from '@/lib/fonts';
import { APP_CONFIG } from '@/lib/config';
import './globals.css';

// Site-wide entity graph — present on every page (including auth-gated
// ones, which cost nothing extra since they're already noindex) so any
// crawler or AI agent only ever needs to resolve one canonical
// Organization/WebSite pair, referenced by @id from page-level schema
// (e.g. the ClothingStore's publisher, or a future Review's itemReviewed)
// instead of every page re-describing the company from scratch.
const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_CONFIG.baseUrl}/#organization`,
      name: APP_CONFIG.name,
      url: APP_CONFIG.baseUrl,
      logo: `${APP_CONFIG.baseUrl}/images/og-image.png`,
      founder: { '@type': 'Group', name: 'DVCH' },
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_CONFIG.baseUrl}/#website`,
      url: APP_CONFIG.baseUrl,
      name: APP_CONFIG.name,
      publisher: { '@id': `${APP_CONFIG.baseUrl}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(`https://${APP_CONFIG.domain}`),
  title: `${APP_CONFIG.name} — All-in-one business App for tailors`,
  description:
    'Manage customers, store measurements, track orders, send invoices, and keep clients updated - all in one simple app.',
  // Almost every route here is either auth-gated or a private-by-link
  // customer page (tracking/receipt) — default to noindex and let the
  // few genuinely public pages (portfolio, privacy) opt back in
  // explicitly via their own metadata/generateMetadata.
  robots: { index: false, follow: false },
  openGraph: {
    siteName: APP_CONFIG.name,
    type: 'website',
    locale: APP_CONFIG.locale.replace('-', '_'),
    images: [{ url: '/images/og-image.png', width: 1200, height: 630 }],
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
    icon: [
      { url: '/app-icon-light.ico?v=10', media: '(prefers-color-scheme: light)' },
      { url: '/app-icon-dark.ico?v=10', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-touch-icon.png?v=6',
  },
};


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Previously maximumScale: 1 + userScalable: false — blocks pinch-zoom
  // entirely, which felt more "app-like" but fails WCAG 1.4.4 (flagged by
  // Lighthouse) and genuinely blocks low-vision users from zooming in
  // anywhere in the app, not just this page. Letting the browser's normal
  // zoom behavior through is the accessible default.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
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
        {/* All iconography is 100% self-hosted bespoke SVG vectors via iconRegistry.tsx.
            Zero external webfont round-trips or missing glyph failures. */}
        {/* Sets data-theme before first paint if the user has forced a
            theme — otherwise they'd see a flash of the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_ANTI_FLASH_SCRIPT }} />
        <JsonLd data={ORGANIZATION_JSONLD} />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <PressFeedback />
        <ReferralCapture />
        <AnalyticsProvider />
        <ThemeProvider>
          <ToastProvider>
            <NetworkMonitor />
            <AppSWRConfig>
              <AuthProvider>
                {children}
              </AuthProvider>
            </AppSWRConfig>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
