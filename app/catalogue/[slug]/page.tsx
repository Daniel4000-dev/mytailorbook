import type { Metadata } from 'next';
import { getPublicCataloguesAction } from '@/app/actions/catalogues';
import { getPublicShowroomStockAction } from '@/app/actions/stock';
import CatalogueClient from './CatalogueClient';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: shopRow } = await supabase
    .from('shops')
    .select('name, logo_url')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = shopRow?.name || `${formattedSlug} Atelier`;

  const title = `${shopName} — Showroom Rack & Bespoke Lookbook`;
  const description = `Shop in-stock ready-to-wear pieces and explore handcrafted bespoke silhouettes by ${shopName}.`;

  return {
    title,
    description,
    alternates: { canonical: `/catalogue/${slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: shopRow?.logo_url ? [{ url: shopRow.logo_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicCataloguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: shopRow } = await supabase
    .from('shops')
    .select('id, name, logo_url, phone, currency, slug')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = shopRow?.name || `${formattedSlug} Atelier`;
  const logoUrl = shopRow?.logo_url || null;
  const shopPhone = shopRow?.phone || null;
  const currency = shopRow?.currency || 'NGN';
  const effectiveSlug = shopRow?.slug || slug;

  const [catalogues, showroomRes] = await Promise.all([
    getPublicCataloguesAction(slug),
    getPublicShowroomStockAction(slug),
  ]);

  const showroomItems = 'items' in showroomRes ? showroomRes.items : [];
  const showroomAccessories = 'accessories' in showroomRes ? showroomRes.accessories : [];

  return (
    <CatalogueClient
      shopName={shopName}
      shopSlug={effectiveSlug}
      logoUrl={logoUrl}
      shopPhone={shopPhone}
      shopCurrency={currency}
      catalogues={catalogues}
      showroomItems={showroomItems}
      showroomAccessories={showroomAccessories}
    />
  );
}
