import type { MetadataRoute } from 'next';
import { APP_CONFIG } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.name,
    short_name: APP_CONFIG.name,
    description:
      'Premium workspace for managing orders, production, and clients in your fashion design studio.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icons/icon-192.png?v=3',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png?v=3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png?v=3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
