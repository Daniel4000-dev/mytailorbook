import type { PublicPortfolio } from '@/app/public-actions';
import PortfolioTemplate from './PortfolioTemplate';

/** Single consolidated template — replaced the old Modern/Editorial/
 *  Heritage 3-way picker, which never read as professional enough for a
 *  tailor to put in front of a client. Every shop gets this one look now,
 *  personalized only by accent color (see Settings → Manage Portfolio). */
export default function PortfolioView({ portfolio }: { portfolio: PublicPortfolio }) {
  return <PortfolioTemplate portfolio={portfolio} />;
}
