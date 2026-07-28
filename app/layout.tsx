import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { APP_CONFIG } from '@/lib/config';
import DesktopGate from '@/components/DesktopGate/DesktopGate';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Fashion Studio Workspace`,
  description:
    'Premium workspace for managing orders, production, and clients in your fashion design studio.',
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
  themeColor: '#F8F8FE',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&family=Manrope:wght@400..800&family=Playfair+Display:wght@600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Poppins:wght@300;400&display=swap" rel="stylesheet" />
        {/* Playfair Display / Fraunces / Poppins: display serifs + light
            sans used only by the "Editorial" and "Heritage" public
            portfolio templates (Settings → Manage Portfolio), not the
            app's own Inter/Manrope UI. */}
        {/* display=block (not swap) — this is an icon ligature font, so the
            fallback-font render during load is a raw word like "dashboard",
            not readable text worth showing early. A brief blank icon beats
            a flash of clipped text. */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
      </head>
      <body>
        <DesktopGate />
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
