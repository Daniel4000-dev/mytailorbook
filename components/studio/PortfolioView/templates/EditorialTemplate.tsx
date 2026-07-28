import type { PublicPortfolio } from '@/app/public-actions';

export default function EditorialTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  return <div>{portfolio.shop.name}</div>;
}
