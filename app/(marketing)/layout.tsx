import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/marketing/Header/Header';
import Footer from '@/components/marketing/Footer/Footer';

/** Shared shell for the public marketing site (home, features, pricing,
 *  about, portfolio-examples). A logged-in visitor landing on any of these
 *  — e.g. someone who bookmarked "/" — is sent straight to their dashboard
 *  rather than shown a sales pitch for a product they already use.
 *  /blog and /privacy intentionally stay outside this group: those should
 *  stay readable while logged in, not bounce to the dashboard. */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
