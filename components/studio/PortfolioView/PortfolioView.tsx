import type { PublicPortfolio } from '@/app/public-actions';
import ModernTemplate from './templates/ModernTemplate';
import EditorialTemplate from './templates/EditorialTemplate';
import HeritageTemplate from './templates/HeritageTemplate';

/** Thin router — the actual visual identity lives in each template, chosen
 *  per-shop via Settings → Manage Portfolio. 'modern' is the original
 *  design and stays the default, so existing shops see no change unless
 *  they pick something else. */
export default function PortfolioView({ portfolio }: { portfolio: PublicPortfolio }) {
  switch (portfolio.shop.portfolioTemplate) {
    case 'editorial':
      return <EditorialTemplate portfolio={portfolio} />;
    case 'heritage':
      return <HeritageTemplate portfolio={portfolio} />;
    case 'modern':
    default:
      return <ModernTemplate portfolio={portfolio} />;
  }
}
