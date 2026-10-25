import { describe, it, expect } from 'vitest';
import { filterFabricOrders } from '../../app/(app)/fabrics/utils';
import { Order } from '@/lib/types';

describe('filterFabricOrders', () => {
  const mockOrders: Partial<Order>[] = [
    {
      id: '1',
      customerName: 'John Doe',
      styleName: 'Agabada',
      status: 'Cutting',
      images: [{ url: 'http://example.com/img1.jpg', stage: 'Cutting', uploadedAt: '2023-01-01' }],
    },
    {
      id: '2',
      customerName: 'Jane Smith',
      orderDetails: 'Blue thread',
      status: 'Documented',
      images: [{ url: 'http://example.com/img2.jpg', stage: 'Documented', uploadedAt: '2023-01-01' }],
    },
    {
      id: '2b',
      customerName: 'Sewing User',
      status: 'Sewing',
      images: [{ url: 'http://example.com/img2b.jpg', stage: 'Sewing', uploadedAt: '2023-01-01' }],
    },
    {
      id: '3',
      customerName: 'No Photo User',
      styleName: 'Senator',
      status: 'Ready',
      images: [], // No photos
    },
    {
      id: '4',
      customerName: 'Completed User',
      styleName: 'Suit',
      status: 'Delivered',
      images: [{ url: 'http://example.com/img3.jpg', stage: 'Delivered', uploadedAt: '2023-01-01' }],
    },
  ];

  it('exclusively includes Documented orders by default', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: '',
      showNoPhoto: true,
    });
    // Should ONLY include 2 (Documented). 1 is Cutting, 2b is Sewing, 3 is Ready, 4 is Completed.
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('excludes orders without photos when showNoPhoto is false', () => {
    const customMockOrders = [
      ...mockOrders,
      { id: '5', customerName: 'No Photo Doc', status: 'Documented', images: [] }
    ];
    const result = filterFabricOrders(customMockOrders as Order[], {
      search: '',
      showNoPhoto: false,
    });
    // Should still only be 2, because 5 has no photos
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('includes Documented orders without photos when showNoPhoto is true', () => {
    const customMockOrders = [
      ...mockOrders,
      { id: '5', customerName: 'No Photo Doc', status: 'Documented', images: [] }
    ];
    const result = filterFabricOrders(customMockOrders as Order[], {
      search: '',
      showNoPhoto: true,
    });
    // Includes 2 (has photo) and 5 (no photo)
    expect(result.length).toBe(2);
    expect(result.map(o => o.id)).toContain('2');
    expect(result.map(o => o.id)).toContain('5');
  });

  it('searches by customer name', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: 'jane',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].customerName).toBe('Jane Smith');
  });

  it('searches by order details', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: 'thread',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty when search does not match', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: 'nonexistent',
      showNoPhoto: true,
    });
    expect(result.length).toBe(0);
  });

  it('filters for in-production orders (Cutting and Sewing)', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: '',
      stageFilter: 'production',
      showNoPhoto: true,
    });
    // Order 1 is Cutting, Order 2b is Sewing
    expect(result.length).toBe(2);
    expect(result.map((o) => o.id)).toContain('1');
    expect(result.map((o) => o.id)).toContain('2b');
  });

  it('filters for all active atelier garments (excluding Delivered)', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: '',
      stageFilter: 'all',
      showNoPhoto: true,
    });
    // Orders 1 (Cutting), 2 (Documented), 2b (Sewing), 3 (Ready) are included. 4 (Delivered) is excluded.
    expect(result.length).toBe(4);
    expect(result.map((o) => o.id)).not.toContain('4');
  });

  it('searches by order reference id with or without hash', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      search: '#2b',
      stageFilter: 'all',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2b');
  });
});
