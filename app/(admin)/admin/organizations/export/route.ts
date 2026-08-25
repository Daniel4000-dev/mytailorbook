import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getOrganizationsForExport } from '@/lib/admin/queries';

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const HEADERS = ['Name', 'Owner Email', 'Plan', 'Shops', 'Customers', 'Orders', 'Referral Code', 'Signed Up'];

export async function GET(request: Request) {
  // A route handler, not a page — requireAdmin() is the only thing
  // standing between this and anyone who guesses the URL, same reasoning
  // as every server action under this route group.
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const rows = await getOrganizationsForExport({
    search: searchParams.get('q') || undefined,
    status: searchParams.get('status') || undefined,
    affiliateId: searchParams.get('affiliate') || undefined,
    dateFrom: searchParams.get('from') || undefined,
    dateTo: searchParams.get('to') || undefined,
  });

  const lines = [
    HEADERS.join(','),
    ...rows.map((r) =>
      [
        r.name,
        r.ownerEmail ?? '',
        r.subscriptionStatus ?? 'free',
        String(r.shopCount),
        String(r.customerCount),
        String(r.orderCount),
        r.affiliateCode ?? '',
        new Date(r.createdAt).toISOString().slice(0, 10),
      ]
        .map(csvEscape)
        .join(',')
    ),
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="organizations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
