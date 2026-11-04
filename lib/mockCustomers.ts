import { MOCK_CUSTOMERS, MOCK_ORDERS } from '@/lib/mockData';
import type { Customer, Order } from '@/lib/types';

const CUSTOMERS_STORAGE_KEY = 'mtb_client_mock_customers';
const CUSTOMERS_MOCK_FLAG_KEY = 'mtb_use_mock_customers';

/**
 * Checks if frontend mock customer mode is active
 */
export function isMockCustomersActive(): boolean {
  if (typeof window === 'undefined') return true;
  const flag = localStorage.getItem(CUSTOMERS_MOCK_FLAG_KEY);
  // Default to true if not explicitly wiped, allowing immediate preview
  return flag !== 'false';
}

/**
 * Retrieves the stored mock customers or initializes with MOCK_CUSTOMERS
 */
export function getStoredMockCustomers(): Customer[] {
  if (typeof window === 'undefined') return MOCK_CUSTOMERS;
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(MOCK_CUSTOMERS));
      localStorage.setItem(CUSTOMERS_MOCK_FLAG_KEY, 'true');
      return MOCK_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_CUSTOMERS;
  } catch (err) {
    console.error('Failed to parse mock customers:', err);
    return MOCK_CUSTOMERS;
  }
}

/**
 * Saves mock customers to localStorage
 */
export function saveMockCustomers(customers: Customer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    localStorage.setItem(CUSTOMERS_MOCK_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Failed to save mock customers:', err);
  }
}

/**
 * Wipes mock customers (for testing authentic blank empty state)
 */
export function wipeMockCustomers(): Customer[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(CUSTOMERS_MOCK_FLAG_KEY, 'false');
    } catch (err) {
      console.error('Failed to wipe mock customers:', err);
    }
  }
  return [];
}

/**
 * Resets back to the default mock customer roster
 */
export function resetMockCustomers(): Customer[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(MOCK_CUSTOMERS));
      localStorage.setItem(CUSTOMERS_MOCK_FLAG_KEY, 'true');
    } catch (err) {
      console.error('Failed to reset mock customers:', err);
    }
  }
  return MOCK_CUSTOMERS;
}

export { MOCK_CUSTOMERS, MOCK_ORDERS };

