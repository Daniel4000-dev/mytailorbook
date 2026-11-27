import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mystitchbooks.app',
  appName: 'MyStitchBook',
  webDir: 'public',
  server: {
    // In production, the native shell points securely to our live Next.js web application via strict HTTPS
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.mystitchbooks.com',
    cleartext: false, // Strict TLS enforcement (Blocks unencrypted HTTP)
    allowNavigation: [
      'www.mystitchbooks.com',
      'mystitchbooks.com',
      '*.supabase.co',
      'api.paystack.co',
      'checkout.paystack.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#131220',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#131220',
    },
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'MyStitchBook',
  },
  android: {
    allowMixedContent: false, // Security: Prevent non-HTTPS content inside webview
    captureInput: true,
    webContentsDebuggingEnabled: false, // Security: Disable remote webview inspection in production
  },
};

export default config;
