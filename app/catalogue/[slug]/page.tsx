import { getPublicCataloguesAction } from '@/app/actions/catalogues';
import CatalogueClient from './CatalogueClient';
import { createClient } from '@/lib/supabase/server';

export default async function PublicCataloguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: shopRow } = await supabase
    .from('shops')
    .select('name, logo_url, phone')
    .eq('slug', slug)
    .maybeSingle();

  // If no DB shop row found for this slug, format title from slug for demo/preview exploration
  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = shopRow?.name || `${formattedSlug} Atelier`;
  const logoUrl = shopRow?.logo_url || null;
  const shopPhone = shopRow?.phone || null;

  const catalogues = await getPublicCataloguesAction(slug);

  return (
    <CatalogueClient
      shopName={shopName}
      logoUrl={logoUrl}
      shopPhone={shopPhone}
      catalogues={catalogues}
    />
  );
}
