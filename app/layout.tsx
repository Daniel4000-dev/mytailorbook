import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider, THEME_ANTI_FLASH_SCRIPT } from '@/contexts/ThemeContext';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar/ServiceWorkerRegistrar';
import AppSWRConfig from '@/components/pwa/AppSWRConfig/AppSWRConfig';
import NetworkMonitor from '@/components/pwa/NetworkMonitor/NetworkMonitor';
import AnalyticsProvider from '@/components/analytics/AnalyticsProvider';
import { inter, fraunces, manrope } from '@/lib/fonts';
import { APP_CONFIG } from '@/lib/config';
import './globals.css';

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
    icon: [
      { url: '/app-icon-light.ico?v=8', media: '(prefers-color-scheme: light)' },
      { url: '/app-icon-dark.ico?v=8', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-touch-icon.png?v=5',
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
        {/* display=block (not swap) — this is an icon ligature font, so the
            fallback-font render during load is a raw word like "dashboard",
            not readable text worth showing early. A brief blank icon beats
            a flash of clipped text.

            icon_names subsets this to only the glyphs <Symbol> actually
            renders — the full variable family (every icon, every
            opsz/wght/FILL/GRAD combination) is ~3.96MB; this list brings it
            down to ~90KB. Not available via next/font/google (Material
            Symbols isn't in its catalog at all), so this stays a manual
            <link>. If you add a new <Symbol name="..."> that isn't in the
            list below, it silently renders blank (tofu), not an error —
            regenerate the list with:
              grep -rohE 'Symbol name="[a-z_0-9]+"' --include="*.tsx" app components \
                | sed -E 's/Symbol name="([a-z_0-9]+)"/\1/' | sort -u
            then also check for dynamic `name={...}` usages (ternaries,
            `icon:` fields in data arrays) that a static grep won't catch —
            including indirection through a lookup object, e.g.
            components/layout/BottomNav/BottomNav.tsx's SYMBOL_MAP (this bit
            us once already: dashboard/precision_manufacturing/settings were
            missing because they only ever appear as object *values*, never
            as a literal Symbol name="..." anywhere in the source).

            The two lint warnings below are both inapplicable here, not
            overlooked: next/font/google doesn't offer Material Symbols at
            all (checked directly against its exports), and display=block
            is the deliberate, correct choice for an icon font per the
            comment above, not the swap the rule assumes. */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=add,add_a_photo,add_box,add_circle,add_photo_alternate,all_inclusive,apparel,arrow_back,arrow_forward,arrow_forward_ios,assignment,auto_awesome,auto_stories,bar_chart,bookmark,broken_image,call,chat,chat_bubble,check,check_circle,checkroom,chevron_left,chevron_right,close,cloud_sync,content_copy,content_cut,contrast,credit_card_off,dark_mode,dashboard,delete,done_all,download,drag_indicator,edit,error,event,event_busy,expand_more,favorite,forum,group,handshake,history,home,hourglass_empty,image,info,inventory_2,ios_share,layers,light_mode,local_fire_department,location_on,lock_open,lock_reset,logout,menu,notification_important,notifications,notifications_off,open_in_new,palette,payments,person,person_add,person_off,photo_library,picture_as_pdf,precision_manufacturing,print,progress_activity,radar,radio_button_unchecked,receipt,receipt_long,remove,reviews,schedule,search,search_off,send,settings,share,smartphone,star,sticky_note_2,storefront,straighten,toggle_on,tune,undo,upload,verified,verified_user,view_kanban,visibility,visibility_off,warning,wifi,workspace_premium&display=block" rel="stylesheet" />
        {/* Sets data-theme before first paint if the user has forced a
            theme — otherwise they'd see a flash of the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_ANTI_FLASH_SCRIPT }} />
      </head>
      <body>
        <ServiceWorkerRegistrar />
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
