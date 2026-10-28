import { describe, it, expect } from 'vitest';
import {
  parseEmbellishmentData,
  serializeEmbellishmentData,
  updateOrderDetailsWithEmbellishment,
} from '@/app/(app)/production/[orderId]/_components/OrderEmbellishmentTracker';

describe('Order Embellishment & Beading Tracker', () => {
  it('returns null when no embellishment tag exists in orderDetails', () => {
    const details = 'Navy Blue Agbada 3-Piece [Fabric: Cashmere Wool]';
    expect(parseEmbellishmentData(details)).toBeNull();
  });

  it('parses full embellishment tag with artisan, timing, due date, cost and notes', () => {
    const details =
      'Senator Suit [Fabric: Italian Wool] [Embellishment: Hand Beading & Stoning | Timing: After Sewing | Artisan: Mama Aisha Beads | Phone: 08012345678 | Due: 2026-11-05 | Status: With Artisan | Cost: 15000 | Notes: Gold crystals along collar and cuffs]';
    const parsed = parseEmbellishmentData(details);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('Hand Beading & Stoning');
    expect(parsed?.timing).toBe('After Sewing');
    expect(parsed?.artisan).toBe('Mama Aisha Beads');
    expect(parsed?.phone).toBe('08012345678');
    expect(parsed?.due).toBe('2026-11-05');
    expect(parsed?.status).toBe('With Artisan');
    expect(parsed?.cost).toBe(15000);
    expect(parsed?.notes).toBe('Gold crystals along collar and cuffs');
  });

  it('parses flat panel embroidery before sewing', () => {
    const details =
      'Kaftan [Embellishment: Computer Embroidery | Timing: Before Sewing | Artisan: Ibrahim Machine | Status: Returned & Inspected]';
    const parsed = parseEmbellishmentData(details);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('Computer Embroidery');
    expect(parsed?.timing).toBe('Before Sewing');
    expect(parsed?.artisan).toBe('Ibrahim Machine');
    expect(parsed?.status).toBe('Returned & Inspected');
  });

  it('serializes embellishment data cleanly into structured tag', () => {
    const data = {
      type: 'Tambour Beading',
      timing: 'After Sewing' as const,
      artisan: 'Tejuosho Beader',
      phone: '08099887766',
      due: '2026-11-10',
      status: 'With Artisan' as const,
      cost: 22000,
      notes: 'Floral motifs on chest panel',
    };

    const serialized = serializeEmbellishmentData(data);
    expect(serialized).toBe(
      '[Embellishment: Tambour Beading | Timing: After Sewing | Artisan: Tejuosho Beader | Phone: 08099887766 | Due: 2026-11-10 | Status: With Artisan | Cost: 22000 | Notes: Floral motifs on chest panel]'
    );
  });

  it('appends embellishment tag to existing orderDetails without overwriting fabric tags', () => {
    const initial = 'Double Breasted Suit [Fabric: Super 120s]';
    const data = {
      type: 'Monogram & Crest',
      timing: 'Before Sewing' as const,
      artisan: 'Master Stitches',
      status: 'With Artisan' as const,
    };

    const updated = updateOrderDetailsWithEmbellishment(initial, data);
    expect(updated).toContain('[Fabric: Super 120s]');
    expect(updated).toContain('[Embellishment: Monogram & Crest | Timing: Before Sewing | Artisan: Master Stitches | Status: With Artisan]');
  });

  it('updates existing embellishment tag in place', () => {
    const initial =
      'Agbada [Fabric: Silk Damask] [Embellishment: Hand Beading | Status: With Artisan]';
    const data = {
      type: 'Hand Beading',
      timing: 'After Sewing' as const,
      artisan: 'Mama Aisha',
      status: 'Returned & Inspected' as const,
    };

    const updated = updateOrderDetailsWithEmbellishment(initial, data);
    expect(updated).toContain('[Fabric: Silk Damask]');
    expect(updated).toContain('Status: Returned & Inspected');
    expect(updated).not.toContain('Status: With Artisan');
  });

  it('removes embellishment tag cleanly when data is null', () => {
    const initial =
      'Agbada [Fabric: Silk Damask] [Embellishment: Hand Beading | Status: With Artisan]';
    const updated = updateOrderDetailsWithEmbellishment(initial, null);

    expect(updated).toBe('Agbada [Fabric: Silk Damask]');
    expect(parseEmbellishmentData(updated)).toBeNull();
  });
});
