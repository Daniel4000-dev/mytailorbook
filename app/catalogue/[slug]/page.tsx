import type { Metadata } from 'next';
import { getPublicCataloguesAction } from '@/app/actions/catalogues';
import { getPublicShowroomStockAction } from '@/app/actions/stock';
import CatalogueClient from './CatalogueClient';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const supabase = await createClient();
  const { data: shopRow } = await supabase
    .from('shops')
    .select('name, logo_url')
    .eq(isUuid ? 'id' : 'slug', slug)
    .maybeSingle();

  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = shopRow?.name || `${formattedSlug} Tailors`;

  const title = `${shopName} — Showroom Rack & Style Lookbook`;
  const description = `Shop in-stock ready-to-wear pieces and explore handcrafted custom styles by ${shopName}.`;

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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const supabase = await createClient();
  const { data: shopRow } = await supabase
    .from('shops')
    .select('id, name, logo_url, phone, currency, slug')
    .eq(isUuid ? 'id' : 'slug', slug)
    .maybeSingle();

  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = shopRow?.name || `${formattedSlug} Tailors`;
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
