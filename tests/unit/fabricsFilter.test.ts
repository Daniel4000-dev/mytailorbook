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
      status: 'Sewing',
      images: [{ id: 'img2', url: 'http://example.com/img2.jpg', thumbUrl: '' }],
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

  it('excludes Completed orders by default', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: '',
      showNoPhoto: true,
    });
    expect(result.length).toBe(3);
    expect(result.map(o => o.id)).not.toContain('4');
  });

  it('excludes orders without photos when showNoPhoto is false', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: '',
      showNoPhoto: false,
    });
    expect(result.length).toBe(2);
    expect(result.map(o => o.id)).not.toContain('3');
  });

  it('includes orders without photos when showNoPhoto is true', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'All',
      search: '',
      showNoPhoto: true,
    });
    // Should include 1, 2, 3 (not 4 because it's completed)
    expect(result.length).toBe(3);
    expect(result.map(o => o.id)).toContain('3');
  });

  it('filters by status', () => {
    const result = filterFabricOrders(mockOrders as Order[], {
      activeFilter: 'Sewing',
      search: '',
      showNoPhoto: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
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
