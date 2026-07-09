import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting for the public, no-login routes (/track, /studio, /receipt)
 * and rating submission — these use a service-role Supabase client that
 * bypasses RLS, scoped only by knowing/guessing a UUID, with no other
 * abuse protection. Without Upstash credentials configured, this degrades
 * to a no-op (always allow) rather than breaking builds/dev for anyone
 * who hasn't set up Redis yet — additive, same as every other optional
 * integration in this app.
 */
const hasUpstashConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const publicRouteLimiter = hasUpstashConfig
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'mytailorbook:public-route',
      analytics: true,
    })
  : null;

export async function checkPublicRouteLimit(ip: string): Promise<{ allowed: boolean }> {
  if (!publicRouteLimiter) return { allowed: true };
  const { success } = await publicRouteLimiter.limit(ip);
  return { allowed: success };
}
