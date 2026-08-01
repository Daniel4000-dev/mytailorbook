import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Every user-uploaded photo (garment progress shots, inspiration
    // images, avatars, shop logos, style-gallery submissions) lives in
    // Supabase Storage under this project — routing them through next/image
    // lets Vercel's edge cache re-serve repeat views (portfolio pages,
    // tracking pages) without hitting Supabase egress again each time.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dbbzgdklhxshgqhwrxoq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Required as of Next 16 — an explicit allowlist rather than open
    // access. 75 is next/image's own default; 82 matches the JPEG quality
    // compressImage.ts already re-encodes uploads at, so re-optimizing
    // through next/image at the same quality doesn't double-degrade them.
    qualities: [75, 82],
  },
  experimental: {
    // Next's client router cache treats dynamic routes (order detail,
    // customer profile — both `ƒ` in the build output, since their params
    // aren't statically known) as never-cached by default (0s). That's a
    // *separate* layer from our own app data cache (SWR/DataContext, which
    // already avoids re-fetching): even with the data instantly available,
    // re-visiting the same order/customer page re-triggered loading.tsx's
    // skeleton every time because the route *segment itself* was discarded
    // from the client cache on every navigation. Raising this lets a quick
    // revisit reuse the already-rendered page instead of remounting cold.
    staleTimes: {
      dynamic: 1800,
      static: 1800,
    },
  },
};

export default nextConfig;
