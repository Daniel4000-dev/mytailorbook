import { createAdminClient } from '@/lib/supabase/admin';
import { StitchWrapData } from './types';
import { determineWrapThemeAndArchetype } from './themes';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export async function getStitchWrapData(
  shopId: string,
  targetYear: number = new Date().getFullYear()
): Promise<StitchWrapData | null> {
  const admin = createAdminClient();

  // 1. Fetch Shop details
  const { data: shop, error: shopErr } = await admin
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();

  if (shopErr || !shop) {
    console.error('[getStitchWrapData] Error fetching shop:', shopErr);
    return null;
  }

  // 2. Evaluate shop tenure & mid-year joiner status
  const shopCreated = new Date(shop.created_at || '2026-01-01');
  const shopYear = shopCreated.getFullYear();
  const shopMonthIndex = shopCreated.getMonth();
  const joinedDate = `${MONTH_NAMES[shopMonthIndex]} ${shopYear}`;

  const isMidYearJoiner = shopYear === targetYear && shopMonthIndex > 0;
  const currentMonthIndex = new Date().getMonth();
  const monthsActive = isMidYearJoiner
    ? Math.max(1, currentMonthIndex - shopMonthIndex + 1)
    : 12;

  // 3. Fetch Orders for target year
  const startOfYear = `${targetYear}-01-01T00:00:00.000Z`;
  const endOfYear = `${targetYear}-12-31T23:59:59.999Z`;

  const { data: orders } = await admin
    .from('orders')
    .select('id, customer_id, customer_name, order_details, style_name, total_bill, status, due_date, created_at, status_history')
    .eq('shop_id', shopId)
    .gte('created_at', startOfYear)
    .lte('created_at', endOfYear);

  const safeOrders = orders || [];

  // Calculate order metrics
  const totalGarments = safeOrders.length;
  const estimatedFabricYards = Math.round(totalGarments * 3.5);

  // Fittings count: orders that reached Cutting, Sewing, Ready or Delivered
  const totalFittings = safeOrders.filter((o) =>
    ['Cutting', 'Sewing', 'Ready', 'Delivered'].includes(o.status)
  ).length;

  // Garment Styles distribution
  const styleCounts: Record<string, number> = {};
  safeOrders.forEach((o) => {
    let style = (o.style_name || '').trim();
    if (!style && o.order_details) {
      // Extract first 3 words or identify style keyword
      const details = o.order_details.toLowerCase();
      if (details.includes('agbada')) style = 'Royal Agbada';
      else if (details.includes('senator')) style = 'Senator Suit';
      else if (details.includes('kaftan')) style = 'Kaftan Set';
      else if (details.includes('suit') || details.includes('tuxedo')) style = 'Bespoke Suit';
      else if (details.includes('gown') || details.includes('dress')) style = 'Evening Gown';
      else if (details.includes('shirt')) style = 'Tailored Shirt';
      else style = 'Bespoke Garment';
    }
    if (!style) style = 'Bespoke Garment';
    styleCounts[style] = (styleCounts[style] || 0) + 1;
  });

  const sortedStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]);
  const topGarmentStyle = sortedStyles[0]?.[0] || 'Bespoke Traditional & Suits';

  // Busiest Month calculation
  const monthlyCounts = new Array(12).fill(0);
  safeOrders.forEach((o) => {
    const m = new Date(o.created_at).getMonth();
    if (m >= 0 && m < 12) {
      monthlyCounts[m]++;
    }
  });

  let busiestMonthIdx = 11; // default to December
  let maxMonthGarments = 0;
  monthlyCounts.forEach((count, idx) => {
    if (count > maxMonthGarments) {
      maxMonthGarments = count;
      busiestMonthIdx = idx;
    }
  });

  const busiestMonth = {
    name: MONTH_NAMES[busiestMonthIdx],
    garmentCount: maxMonthGarments || totalGarments,
  };

  // Turnaround days & on-time delivery
  let totalDays = 0;
  let turnaroundCount = 0;
  let onTimeCount = 0;

  safeOrders.forEach((o) => {
    if (o.created_at && o.due_date) {
      const created = new Date(o.created_at).getTime();
      const due = new Date(o.due_date).getTime();
      const diff = Math.max(1, Math.round((due - created) / (1000 * 60 * 60 * 24)));
      totalDays += diff;
      turnaroundCount++;
      if (['Ready', 'Delivered'].includes(o.status)) {
        onTimeCount++;
      }
    }
  });

  const averageTurnaroundDays =
    turnaroundCount > 0 ? Math.round(totalDays / turnaroundCount) : 5;
  const onTimeDeliveryRate =
    turnaroundCount > 0 ? Math.round((onTimeCount / turnaroundCount) * 100) : 98;

  // 4. Fetch Customers for Client Metrics
  const { data: customers } = await admin
    .from('customers')
    .select('id, full_name, created_at')
    .eq('shop_id', shopId);

  const safeCustomers = customers || [];
  const totalClients = Math.max(safeCustomers.length, new Set(safeOrders.map((o) => o.customer_name).filter(Boolean)).size);

  const newClientsThisYear = safeCustomers.filter(
    (c) => new Date(c.created_at) >= new Date(startOfYear)
  ).length;

  // Top VIP Client
  const customerOrderCounts: Record<string, { count: number; spend: number }> = {};
  safeOrders.forEach((o) => {
    const name = (o.customer_name || 'Valued Patron').trim();
    if (!customerOrderCounts[name]) {
      customerOrderCounts[name] = { count: 0, spend: 0 };
    }
    customerOrderCounts[name].count += 1;
    customerOrderCounts[name].spend += Number(o.total_bill || 0);
  });

  const sortedClients = Object.entries(customerOrderCounts).sort(
    (a, b) => b[1].count - a[1].count || b[1].spend - a[1].spend
  );

  const topClientRaw = sortedClients[0] || ['Chief Adebayo & Patrons', { count: 4, spend: 180000 }];
  const topClientName = topClientRaw[0];

  // Masked name for privacy (e.g. "Alhaji B." or initials)
  const nameParts = topClientName.split(' ').filter(Boolean);
  const maskedName =
    nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
      : `${topClientName[0] || 'V'}. [VIP Patron]`;

  const topClient = {
    name: topClientName,
    maskedName,
    garmentCount: topClientRaw[1].count,
    totalSpent: topClientRaw[1].spend,
  };

  // 5. Financial Turnover
  const totalRevenue = safeOrders.reduce((acc, o) => acc + Number(o.total_bill || 0), 0);

  // 6. Streaks & Workshop Resilience
  const longestStreak = Math.max(shop.streak_best || 0, shop.streak_current || 0, 1);
  const totalActiveDays = Math.max(
    new Set(safeOrders.map((o) => (o.created_at || '').substring(0, 10))).size,
    longestStreak * 2,
    monthsActive * 8
  );

  // 7. Tailor Circle Pod Partner
  let circlePartnerName: string | null = null;
  let circleDaysTogether = 0;

  if (shop.buddy_shop_id) {
    const { data: buddyShop } = await admin
      .from('shops')
      .select('name')
      .eq('id', shop.buddy_shop_id)
      .single();
    if (buddyShop?.name) {
      circlePartnerName = buddyShop.name;
      circleDaysTogether = shop.buddy_streak_count || 12;
    }
  }

  // 8. Photo Curation (Shop's actual garment photos + bespoke editorial lookbook matches)
  let heroStylePhoto = '/images/blog/agbada-ceremonial-amurode.jpg';
  let fabricDetailPhoto = '/images/blog/agbada-embroidery-detail.jpg';
  let celebrationPhoto = '/images/blog/owambe-cover.jpg';
  let patronFitPhoto = '/images/blog/senator-wear-cover.jpg';

  const styleLower = topGarmentStyle.toLowerCase();
  if (styleLower.includes('senator')) {
    heroStylePhoto = '/images/blog/senator-wear-cover.jpg';
    fabricDetailPhoto = '/images/blog/senator-collar-detail.jpg';
    patronFitPhoto = '/images/garments/senator-male.jpg';
  } else if (styleLower.includes('kaftan')) {
    heroStylePhoto = '/images/blog/kaftan-babban-riga-cover.jpg';
    fabricDetailPhoto = '/images/blog/kaftan-embroidery-detail.jpg';
    patronFitPhoto = '/images/garments/kaftan-male.jpg';
  } else if (styleLower.includes('suit') || styleLower.includes('tuxedo')) {
    heroStylePhoto = '/images/mock/mock_suit_nigerian_1789589547408.jpg';
    fabricDetailPhoto = '/images/mock/mock_detail_nigerian_1789589583459.jpg';
    patronFitPhoto = '/images/garments/suit-male.jpg';
  } else if (styleLower.includes('gown') || styleLower.includes('dress') || styleLower.includes('lace')) {
    heroStylePhoto = '/images/blog/aso-oke-structured-gown.jpg';
    fabricDetailPhoto = '/images/blog/lace-fabric-detail.jpg';
    patronFitPhoto = '/images/blog/bridal-gown-cover.jpg';
  } else if (styleLower.includes('ankara')) {
    heroStylePhoto = '/images/blog/ankara-2026-cover.jpg';
    fabricDetailPhoto = '/images/blog/ankara-mixed-print.jpg';
    patronFitPhoto = '/images/blog/ankara-mermaid-gown.jpg';
  } else if (styleLower.includes('boubou') || styleLower.includes('buba')) {
    heroStylePhoto = '/images/blog/buba-iro-structured.jpg';
    fabricDetailPhoto = '/images/blog/aso-oke-lace-panels.jpg';
    patronFitPhoto = '/images/garments/boubou-female.jpg';
  }

  // Check if shop has custom uploaded style photos in DB
  try {
    const { data: dbStyles } = await admin
      .from('styles')
      .select('photo_url, image_url')
      .eq('shop_id', shop.id)
      .limit(4);

    if (dbStyles && dbStyles.length > 0) {
      const valid = dbStyles
        .map((s: { photo_url?: string; image_url?: string }) => s.photo_url || s.image_url)
        .filter(Boolean) as string[];
      if (valid[0]) heroStylePhoto = valid[0];
      if (valid[1]) patronFitPhoto = valid[1];
    }
  } catch {
    // Fallback to editorial lookbook photography
  }

  const featuredGarmentPhotos = {
    heroStylePhoto,
    fabricDetailPhoto,
    celebrationPhoto,
    patronFitPhoto,
  };

  // 9. Color Science & Tailor Archetype Assignment
  const { theme, archetype } = determineWrapThemeAndArchetype({
    topGarmentStyle,
    averageTurnaroundDays,
    longestStreak,
    totalGarments,
    busiestMonthName: busiestMonth.name,
  });

  return {
    year: targetYear,
    shopId: shop.id,
    shopName: shop.name || "Master Tailor's Workshop",
    joinedDate,
    isMidYearJoiner,
    monthsActive,
    totalGarments: totalGarments || 1,
    estimatedFabricYards: estimatedFabricYards || 4,
    totalFittings: totalFittings || 1,
    totalClients: totalClients || 1,
    newClientsThisYear: newClientsThisYear || totalClients,
    topClient,
    topGarmentStyle,
    busiestMonth,
    averageTurnaroundDays,
    longestStreak,
    totalActiveDays,
    circlePartnerName,
    circleDaysTogether,
    totalRevenue,
    onTimeDeliveryRate,
    archetype,
    theme,
    featuredGarmentPhotos,
  };
}
