import type { Order } from '@/lib/types';

export const DEFAULT_MOCK_FABRIC_ORDERS: Order[] = [
  {
    id: 'ord-fabric-101',
    shopId: 'mock-shop',
    customerId: 'cust-101',
    customerName: 'Chief Adeleke O.',
    styleName: '3-Piece Royal Agbada',
    status: 'Documented',
    priority: 'rush',
    materialSuppliedBy: 'customer',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    orderDetails: 'Hand-Woven Royal Blue Aso-Oke (7.0 yds). Chest piece requires Amurode gold metallic embroidery. Cut facing with midnight blue silk satin. 2.5-inch hem allowance for basted fitting.',
    images: [
      {
        url: '/images/blog/agbada-embroidery-detail.jpg',
        stage: 'Documented',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 17.5,
      shoulder: 20.5,
      chest: 44,
      length: 58,
      sleeveLength: 26,
      waist: 38,
      trouserLength: 42,
      thigh: 26,
      ankle: 16,
    },
    totalBill: 380000,
    depositPaid: 250000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-fabric-102',
    shopId: 'mock-shop',
    customerId: 'cust-102',
    customerName: 'Dr. Chinedu M.',
    styleName: 'Executive Bespoke Suit',
    status: 'Cutting',
    priority: 'urgent',
    materialSuppliedBy: 'shop',
    dueDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    orderDetails: 'Super 150s Navy Merino Wool (3.5 yds). Full floating horsehair canvas. Milanese lapel buttonhole. Surgeon cuffs with 4 working horn buttons. Cut trouser with double reverse pleats.',
    images: [
      {
        url: '/images/mock/mock_detail_nigerian_1789589583459.jpg',
        stage: 'Cutting',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 16.5,
      shoulder: 19.0,
      chest: 42,
      length: 31,
      sleeveLength: 25.5,
      waist: 34,
      trouserLength: 41,
      thigh: 24,
      ankle: 15,
    },
    totalBill: 520000,
    depositPaid: 520000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
      {
        from: 'Documented',
        to: 'Cutting',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        changedBy: 'user-cutter',
        changedByName: 'Master Cutter',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-fabric-103',
    shopId: 'mock-shop',
    customerId: 'cust-103',
    customerName: 'Ibrahim Bello',
    styleName: 'Minimalist Senator Set',
    status: 'Documented',
    priority: 'normal',
    materialSuppliedBy: 'customer',
    dueDate: new Date(Date.now() + 86400000 * 8).toISOString(),
    orderDetails: 'Dark Emerald Irish Cashmere Blend (4.0 yds). Concealed button placket, geometric mandarin collar. Cut 2-inch side slits for ceremonial ease.',
    images: [
      {
        url: '/images/blog/senator-collar-detail.jpg',
        stage: 'Documented',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 17.0,
      shoulder: 19.5,
      chest: 43,
      length: 38,
      sleeveLength: 25.0,
      waist: 36,
      trouserLength: 41.5,
      thigh: 25,
      ankle: 15.5,
    },
    totalBill: 195000,
    depositPaid: 120000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-fabric-104',
    shopId: 'mock-shop',
    customerId: 'cust-104',
    customerName: 'Senator Al-Hassan',
    styleName: 'Luxe Kaftan & Danshiki',
    status: 'Cutting',
    priority: 'rush',
    materialSuppliedBy: 'shop',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    orderDetails: 'Crisp Swiss Damask (5.0 yds). Tone-on-tone embroidery on collar and sleeve hems. Pattern match geometric symmetry across neck placket.',
    images: [
      {
        url: '/images/blog/kaftan-embroidery-detail.jpg',
        stage: 'Cutting',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 18.0,
      shoulder: 21.0,
      chest: 46,
      length: 56,
      sleeveLength: 26.5,
      waist: 40,
      trouserLength: 43,
      thigh: 28,
      ankle: 17,
    },
    totalBill: 240000,
    depositPaid: 150000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
      {
        from: 'Documented',
        to: 'Cutting',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        changedBy: 'user-cutter',
        changedByName: 'Master Cutter',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-fabric-105',
    shopId: 'mock-shop',
    customerId: 'cust-105',
    customerName: 'Kemi Adeyemi',
    styleName: 'Bridal Reception Gown',
    status: 'Sewing',
    priority: 'urgent',
    materialSuppliedBy: 'customer',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    orderDetails: 'French Beaded Corded Lace & Silk Organza Lining (5.5 yds). Cut with internal steel-boned corsetry allowance. Hand-tack scalloped lace along sweetheart neckline.',
    images: [
      {
        url: '/images/blog/lace-fabric-detail.jpg',
        stage: 'Sewing',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 14.5,
      shoulder: 16.5,
      chest: 36,
      bust: 38,
      waist: 28,
      hip: 41,
      length: 62,
    },
    totalBill: 650000,
    depositPaid: 400000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
      {
        from: 'Documented',
        to: 'Cutting',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        changedBy: 'user-cutter',
        changedByName: 'Master Cutter',
      },
      {
        from: 'Cutting',
        to: 'Sewing',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        changedBy: 'user-tailor',
        changedByName: 'Lead Machinist',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-fabric-106',
    shopId: 'mock-shop',
    customerId: 'cust-106',
    customerName: 'Mrs. Ngozi Okonjo',
    styleName: 'Traditional George Blouse & Wrapper',
    status: 'Documented',
    priority: 'normal',
    materialSuppliedBy: 'customer',
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    orderDetails: 'Gold-Embroidered Indian George Fabric (6.0 yds). Intricate heavy gold bullion thread. Cut peplum flare with horsehair braid hem for architectural drape.',
    images: [
      {
        url: '/images/blog/george-fabric-detail.jpg',
        stage: 'Documented',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 15.0,
      shoulder: 17.0,
      chest: 40,
      bust: 40,
      waist: 32,
      hip: 44,
      length: 26,
    },
    totalBill: 280000,
    depositPaid: 180000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-fabric-107',
    shopId: 'mock-shop',
    customerId: 'cust-107',
    customerName: 'Mazi Emeka Nwosu',
    styleName: 'Lionhead Velvet Isiagu',
    status: 'Documented',
    priority: 'normal',
    materialSuppliedBy: 'shop',
    dueDate: new Date(Date.now() + 86400000 * 12).toISOString(),
    orderDetails: 'Midnight Black Velvet Isiagu (4.0 yds). Align lion head medallions centered on chest and back. Gold button placket with hidden loop fasteners.',
    images: [
      {
        url: '/images/blog/isiagu-fabric-detail.jpg',
        stage: 'Documented',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      neck: 17.0,
      shoulder: 20.0,
      chest: 44,
      length: 36,
      sleeveLength: 25.5,
      waist: 38,
      trouserLength: 42,
      thigh: 26,
      ankle: 16,
    },
    totalBill: 210000,
    depositPaid: 100000,
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        changedBy: 'user-master',
        changedByName: 'Master Tailor',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const FABRICS_STORAGE_KEY = 'mtb_client_mock_fabrics';
const FABRICS_MOCK_FLAG_KEY = 'mtb_use_mock_fabrics';

/**
 * Checks if frontend mock fabrics mode is active
 */
export function isMockFabricsActive(): boolean {
  if (typeof window === 'undefined') return true;
  const flag = localStorage.getItem(FABRICS_MOCK_FLAG_KEY);
  return flag !== 'false';
}

/**
 * Retrieves the stored mock fabrics or initializes it with DEFAULT_MOCK_FABRIC_ORDERS
 */
export function getStoredMockFabricOrders(): Order[] {
  if (typeof window === 'undefined') {
    return DEFAULT_MOCK_FABRIC_ORDERS;
  }

  try {
    const raw = localStorage.getItem(FABRICS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FABRICS_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_FABRIC_ORDERS));
      localStorage.setItem(FABRICS_MOCK_FLAG_KEY, 'true');
      return DEFAULT_MOCK_FABRIC_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_MOCK_FABRIC_ORDERS;
  } catch {
    return DEFAULT_MOCK_FABRIC_ORDERS;
  }
}

/**
 * Saves mock fabric orders to localStorage
 */
export function saveMockFabricOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FABRICS_STORAGE_KEY, JSON.stringify(orders));
    localStorage.setItem(FABRICS_MOCK_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Failed to save mock fabric orders:', err);
  }
}

/**
 * Wipes mock fabrics (empties the cutting table for testing blank state)
 */
export function wipeMockFabricOrders(): Order[] {
  const empty: Order[] = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FABRICS_STORAGE_KEY, JSON.stringify(empty));
      localStorage.setItem(FABRICS_MOCK_FLAG_KEY, 'false');
    } catch (err) {
      console.error('Failed to wipe mock fabric orders:', err);
    }
  }
  return empty;
}

/**
 * Resets back to the rich default mock fabric orders
 */
export function resetMockFabricOrders(): Order[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FABRICS_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_FABRIC_ORDERS));
      localStorage.setItem(FABRICS_MOCK_FLAG_KEY, 'true');
    } catch (err) {
      console.error('Failed to reset mock fabric orders:', err);
    }
  }
  return DEFAULT_MOCK_FABRIC_ORDERS;
}
