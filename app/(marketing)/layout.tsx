import Header from '@/components/marketing/Header/Header';
import Footer from '@/components/marketing/Footer/Footer';
import MarketingSplash from '@/components/marketing/MarketingSplash/MarketingSplash';

/** Shared shell for the public marketing site (home, features, pricing,
 *  about, portfolio-examples). The logged-in-visitor-redirects-to-dashboard
 *  behavior lives in proxy.ts now, not here — it already resolves the user
 *  on every request for its own auth gating, so doing it again here was a
 *  second Supabase Auth API round-trip per request and forced this entire
 *  route group to render dynamically (no static generation) for no benefit
 *  to an anonymous visitor, who is the overwhelming majority of traffic on
 *  a marketing site. /blog and /privacy intentionally stay outside both
 *  this group and that proxy.ts list: those should stay readable while
 *  logged in, not bounce to the dashboard. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingSplash />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
