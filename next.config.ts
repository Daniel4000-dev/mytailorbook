import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
