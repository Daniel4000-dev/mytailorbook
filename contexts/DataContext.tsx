'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import useSWR from 'swr';
import type { Order, Customer, OrderStatus, Measurements, User, Shop } from '@/lib/types';
import { normalizePhone } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { createStaffAccount } from '@/app/auth-actions';
import { createClient } from '@/lib/supabase/client';
import {
  getShopBundle,
  addOrderAction,
  addOrderBatchAction,
  updateOrderStatusAction,
  updateOrderAction,
  addCustomerAction,
  updateCustomerMeasurementsAction,
  updateCustomerStyleProfileAction,
  deleteCustomerStyleProfileAction,
  updateCustomerProfileAction,
  updateStaffAction,
  updateShopAction,
  upsertCustomStyleAction,
  getStaff,
} from '@/app/actions';

interface ShopBundle {
  orders: Order[];
  customers: Customer[];
  staffMembers: User[];
  shop: Shop | null;
}

const EMPTY_BUNDLE: ShopBundle = { orders: [], customers: [], staffMembers: [], shop: null };

interface DataContextValue {
  orders: Order[];
  customers: Customer[];
  staffMembers: User[];
  shops: Shop[];
  currentShop: Shop | null;
  isLoaded: boolean;
  addOrder: (order: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addOrderBatch: (garments: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'>[]) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'shopId' | 'createdAt'>) => Promise<Customer>;
  updateCustomerMeasurements: (customerId: string, measurements: Measurements) => Promise<void>;
  updateCustomerStyleProfile: (customerId: string, styleName: string, measurements: Measurements) => Promise<void>;
  deleteCustomerStyleProfile: (customerId: string, styleName: string) => Promise<void>;
  updateCustomerProfile: (
    customerId: string,
    updates: Partial<Pick<Customer, 'fullName' | 'whatsappNumber' | 'gender' | 'preferredStyles'>>
  ) => Promise<void>;
  getCustomerOrders: (customerId: string) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersByStaff: (staffUid: string) => Order[];
  findOrCreateCustomer: (fullName: string, whatsappNumber: string) => Promise<Customer>;
  addStaff: (name: string, email: string, password: string) => Promise<void>;
  updateStaff: (uid: string, updates: Partial<User>) => Promise<void>;
  updateShop: (updates: Partial<Shop>) => Promise<void>;
  upsertCustomStyle: (name: string, photoUrl?: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const shopId = user?.shopId ?? null;

  // SWR keeps this shop's bundle in an in-memory cache keyed by shopId, so
  // switching pages within the app never re-fetches — the cached value is
  // returned instantly. `revalidateOnFocus` is deliberately OFF: this bundle
  // is the shop's entire order/customer/staff history, unpaginated, and
  // every mutation already pushes its own optimistic update via `mutate`.
  // With it on, the extremely common phone flow of "tap the WhatsApp FAB →
  // send a message → switch back to the app" silently re-downloaded and
  // re-rendered the whole dataset on every return, which is exactly the
  // kind of invisible lag that reads as "this app feels slow."
  //
  // Cross-device sync (a second staff member's phone changing something)
  // used to be handled by a blind 2-minute poll. That's replaced below by a
  // Supabase Realtime subscription: data is used from memory indefinitely
  // and only re-fetched when a real change actually happens to this shop's
  // rows, not on a guessed timer.
  const { data, mutate } = useSWR(
    shopId ? (['shop-bundle', shopId] as const) : null,
    ([, id]) => getShopBundle(id),
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Push-based invalidation: any change to this shop's orders/customers/
  // profiles (from this device or another) re-fetches the bundle once,
  // instead of polling on a timer regardless of whether anything changed.
  useEffect(() => {
    if (!shopId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`shop-sync-${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `shop_id=eq.${shopId}` }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `shop_id=eq.${shopId}` }, () => mutate())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, mutate]);

  const bundle = data ?? EMPTY_BUNDLE;
  const { orders, customers, staffMembers, shop: currentShop } = bundle;
  // Only true once we've never had data for this shop — a background
  // revalidation (isValidating) keeps showing the last-known-good data.
  const isLoaded = !!data;

  const addOrder = useCallback(
    async (orderData: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => {
      if (!shopId) return;
      const updated = await addOrderAction(shopId, orderData);
      mutate((current) => (current ? { ...current, orders: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const addOrderBatch = useCallback(
    async (garments: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'>[]) => {
      if (!shopId) return;
      const updated = await addOrderBatchAction(shopId, garments);
      mutate((current) => (current ? { ...current, orders: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => {
      if (!shopId) return;
      const updated = await updateOrderStatusAction(orderId, newStatus, changedBy, changedByName, shopId);
      mutate((current) => (current ? { ...current, orders: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const updateOrder = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      if (!shopId) return;
      const updated = await updateOrderAction(orderId, updates, shopId);
      mutate((current) => (current ? { ...current, orders: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const addCustomer = useCallback(
    async (customerData: Omit<Customer, 'id' | 'shopId' | 'createdAt'>): Promise<Customer> => {
      if (!shopId) throw new Error('No active shop for the current user');
      const { newCustomer, customers: updated } = await addCustomerAction(shopId, {
        ...customerData,
        whatsappNumber: normalizePhone(customerData.whatsappNumber),
      });
      mutate((current) => (current ? { ...current, customers: updated } : current), { revalidate: false });
      return newCustomer;
    },
    [shopId, mutate]
  );

  const updateCustomerMeasurements = useCallback(
    async (customerId: string, measurements: Measurements) => {
      if (!shopId) return;
      const updated = await updateCustomerMeasurementsAction(customerId, measurements, shopId);
      mutate((current) => (current ? { ...current, customers: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const updateCustomerStyleProfile = useCallback(
    async (customerId: string, styleName: string, measurements: Measurements) => {
      if (!shopId) return;
      const updated = await updateCustomerStyleProfileAction(customerId, styleName, measurements, shopId);
      mutate((current) => (current ? { ...current, customers: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const deleteCustomerStyleProfile = useCallback(
    async (customerId: string, styleName: string) => {
      if (!shopId) return;
      const updated = await deleteCustomerStyleProfileAction(customerId, styleName, shopId);
      mutate((current) => (current ? { ...current, customers: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const updateCustomerProfile = useCallback(
    async (
      customerId: string,
      updates: Partial<Pick<Customer, 'fullName' | 'whatsappNumber' | 'gender' | 'preferredStyles'>>
    ) => {
      if (!shopId) return;
      const normalized = updates.whatsappNumber !== undefined
        ? { ...updates, whatsappNumber: normalizePhone(updates.whatsappNumber) }
        : updates;
      const updated = await updateCustomerProfileAction(customerId, normalized, shopId);
      mutate((current) => (current ? { ...current, customers: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const findOrCreateCustomer = useCallback(
    async (fullName: string, whatsappNumber: string): Promise<Customer> => {
      const normalized = normalizePhone(whatsappNumber);
      const existing = customers.find(c => c.whatsappNumber === normalized);
      if (existing) return existing;
      return await addCustomer({ fullName, whatsappNumber: normalized, gender: 'female' });
    },
    [customers, addCustomer]
  );

  const getCustomerOrders = useCallback(
    (customerId: string): Order[] => orders.filter((o) => o.customerId === customerId),
    [orders]
  );

  const getOrdersByStatus = useCallback(
    (status: OrderStatus): Order[] => orders.filter((o) => o.status === status),
    [orders]
  );

  const getOrdersByStaff = useCallback(
    (staffUid: string): Order[] => orders.filter((o) => o.assignedTo === staffUid),
    [orders]
  );

  const addStaff = useCallback(
    async (name: string, email: string, password: string) => {
      if (!shopId) return;
      const { error } = await createStaffAccount(shopId, name, email, password);
      if (error) throw new Error(error);
      const updated = await getStaff(shopId);
      mutate((current) => (current ? { ...current, staffMembers: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const updateStaff = useCallback(
    async (uid: string, updates: Partial<User>) => {
      if (!shopId) return;
      const updated = await updateStaffAction(uid, updates, shopId);
      mutate((current) => (current ? { ...current, staffMembers: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const updateShop = useCallback(
    async (updates: Partial<Shop>) => {
      if (!shopId) return;
      const updated = await updateShopAction(shopId, updates);
      mutate((current) => (current ? { ...current, shop: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const upsertCustomStyle = useCallback(
    async (name: string, photoUrl?: string) => {
      if (!shopId) return;
      const updated = await upsertCustomStyleAction(shopId, name, photoUrl);
      mutate((current) => (current ? { ...current, shop: updated } : current), { revalidate: false });
    },
    [shopId, mutate]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      orders,
      customers,
      staffMembers,
      shops: currentShop ? [currentShop] : [],
      currentShop,
      isLoaded,
      addOrder,
      addOrderBatch,
      updateOrderStatus,
      updateOrder,
      addCustomer,
      updateCustomerMeasurements,
      updateCustomerStyleProfile,
      deleteCustomerStyleProfile,
      updateCustomerProfile,
      getCustomerOrders,
      getOrdersByStatus,
      getOrdersByStaff,
      findOrCreateCustomer,
      addStaff,
      updateStaff,
      updateShop,
      upsertCustomStyle,
    }),
    [orders, customers, staffMembers, currentShop, isLoaded, addOrder, addOrderBatch, updateOrderStatus, updateOrder, addCustomer, updateCustomerMeasurements, updateCustomerStyleProfile, deleteCustomerStyleProfile, updateCustomerProfile, getCustomerOrders, getOrdersByStatus, getOrdersByStaff, findOrCreateCustomer, addStaff, updateStaff, updateShop, upsertCustomStyle]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
