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
      images: [{ id: 'img1', url: 'http://example.com/img1.jpg', thumbUrl: '' }],
    },
    {
      id: '2',
      customerName: 'Jane Smith',
      orderDetails: 'Blue thread',
      status: 'Documented',
      images: [{ id: 'img2', url: 'http://example.com/img2.jpg', thumbUrl: '' }],
    },
    {
      id: '2b',
      customerName: 'Sewing User',
      status: 'Sewing',
      images: [{ id: 'img2b', url: 'http://example.com/img2b.jpg', thumbUrl: '' }],
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
      status: 'Completed',
      images: [{ id: 'img3', url: 'http://example.com/img3.jpg', thumbUrl: '' }],
    },
  ];

  it('excludes Completed, Sewing, and Ready orders by default', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: '',
      showNoPhoto: true,
    });
    // Should include 1 and 2 (not 2b, 3, or 4 because they are Sewing, Ready, Completed)
    expect(result.length).toBe(2);
    expect(result.map(o => o.id)).toContain('1');
    expect(result.map(o => o.id)).toContain('2');
    expect(result.map(o => o.id)).not.toContain('2b');
    expect(result.map(o => o.id)).not.toContain('3');
    expect(result.map(o => o.id)).not.toContain('4');
  });

  it('excludes orders without photos when showNoPhoto is false', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: '',
      showNoPhoto: false,
    });
    // Should be 1 and 2, because both have photos. 2b, 3, 4 are excluded by status.
    expect(result.length).toBe(2);
    expect(result.map(o => o.id)).toContain('1');
    expect(result.map(o => o.id)).toContain('2');
  });

  it('includes orders without photos when showNoPhoto is true', () => {
    // Add a Documented order without photo to test this
    const customMockOrders = [
      ...mockOrders,
      { id: '5', customerName: 'No Photo', status: 'Documented', images: [] }
    ];
    const result = filterFabricOrders(customMockOrders as Order[], {
      activeFilter: 'All',
      search: '',
      showNoPhoto: true,
    });
    expect(result.map(o => o.id)).toContain('5');
  });

  it('filters by status correctly', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'Cutting',
      search: '',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
  });

  it('searches by customer name', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: 'jane',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].customerName).toBe('Jane Smith');
  });

  it('searches by style name', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: 'agabada',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
  });

  it('searches by order details', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: 'blue thread',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty when search does not match', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: 'nonexistent',
      showNoPhoto: true,
    });
    expect(result.length).toBe(0);
  });
});
