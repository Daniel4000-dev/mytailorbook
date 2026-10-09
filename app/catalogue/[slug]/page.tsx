import { getPublicCataloguesAction } from '@/app/actions/catalogues';
import { notFound } from 'next/navigation';
import CatalogueClient from './CatalogueClient';
import { createClient } from '@/lib/supabase/server';

export default async function PublicCataloguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: shopRow } = await supabase
    .from('shops')
    .select('name, logo_url, phone')
    .eq('slug', slug)
    .single();
    
  if (!shopRow) notFound();
  
  const catalogues = await getPublicCataloguesAction(slug);
  
  return <CatalogueClient shopName={shopRow.name} logoUrl={shopRow.logo_url} shopPhone={shopRow.phone} catalogues={catalogues} />;
}
