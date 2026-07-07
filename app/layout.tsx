import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { APP_CONFIG } from '@/lib/config';
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
  themeColor: '#FAF2E8',
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
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@100..900&family=Cinzel:wght@400..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
