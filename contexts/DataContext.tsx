'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import useSWR from 'swr';
import type { Order, Customer, OrderStatus, Measurements, User, Shop } from '@/lib/types';
import { normalizePhone } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { createStaffAccount } from '@/app/auth-actions';
import { createClient } from '@/lib/supabase/client';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';
import {
  getShopBundle,
  getOrgBranches,
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
  renameCustomStyleEverywhereAction,
  getStaff,
  deleteCustomerAction,
  deleteOrderAction,
} from '@/app/actions';

const ACTIVE_BRANCH_COOKIE = 'mtb_active_branch';

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
  activeBranchId: string | null;
  setActiveBranchId: (shopId: string) => void;
  refreshBranches: () => void;
  /** Forces an immediate refetch of the whole shop bundle (orders,
   *  customers, shop record) — the realtime subscription above already
   *  does this reactively when the underlying rows change, but this is a
   *  manual escalation for moments that can't wait on that, e.g. right
   *  after a payment popup reports success, before the webhook may have
   *  landed yet. */
  refreshShop: () => void;
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
    updates: Partial<Pick<Customer, 'fullName' | 'whatsappNumber' | 'gender' | 'preferredStyles' | 'address'>>
  ) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<{ error?: string; deletedOrderCount?: number }>;
  deleteOrder: (orderId: string) => Promise<{ error?: string }>;
  getCustomerOrders: (customerId: string) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersByStaff: (staffUid: string) => Order[];
  findOrCreateCustomer: (fullName: string, whatsappNumber: string) => Promise<Customer>;
  addStaff: (name: string, email: string, password: string, role?: 'Staff' | 'BranchManager' | 'Accountant') => Promise<void>;
  updateStaff: (uid: string, updates: Partial<User>) => Promise<void>;
  updateShop: (updates: Partial<Shop>) => Promise<void>;
  upsertCustomStyle: (
    name: string,
    photoUrl?: string,
    measurementFields?: { id: string; label: string }[],
    gender?: 'male' | 'female'
  ) => Promise<void>;
  renameCustomStyle: (oldName: string, newName: string) => Promise<void>;
}



const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const shopId = user?.shopId ?? null;
  const orgId = user?.orgId ?? null;

  // Every branch (shops row) under this user's org — powers the branch
  // switcher. For every org today (exactly one branch), this is a
  // single-item list and the switcher stays hidden.
  const { data: branchesData, mutate: mutateBranches } = useSWR(
    orgId ? (['org-branches', orgId] as const) : null,
    ([, id]) => getOrgBranches(id),
    { dedupingInterval: 60_000, revalidateOnFocus: false }
  );
  const branches = useMemo(() => branchesData ?? [], [branchesData]);
  const refreshBranches = useCallback(() => {
    mutateBranches();
  }, [mutateBranches]);

  // Which branch's orders/staff are currently shown — defaults to the
  // user's own branch, persisted across sessions once the Owner switches.
  // `manualOverride` is a derived value (read once from the cookie, same
  // lazy-init pattern as the dashboard's hide-balance toggles), and the
  // actual resolved `activeBranchId` is validated against the org's real
  // branch list once loaded, so a stale cookie referencing a branch that
  // no longer exists (or belongs to a different org, e.g. after switching
  // accounts) can't silently apply.
  const [manualOverride, setManualOverride] = useState<string | null>(() => getClientCookie(ACTIVE_BRANCH_COOKIE));

  const activeBranchId = useMemo(() => {
    if (manualOverride && (branches.length === 0 || branches.some((b) => b.id === manualOverride))) {
      return manualOverride;
    }
    return shopId;
  }, [manualOverride, branches, shopId]);

  const setActiveBranchId = useCallback((newShopId: string) => {
    setManualOverride(newShopId);
    setClientCookie(ACTIVE_BRANCH_COOKIE, newShopId);
  }, []);

  // SWR keeps this bundle in an in-memory cache keyed by branch+org, so
  // switching pages within the app never re-fetches — the cached value is
  // returned instantly. `revalidateOnFocus` is deliberately OFF: this bundle
  // is the org's entire customer history plus the active branch's entire
  // order/staff history, unpaginated, and every mutation already pushes its
  // own optimistic update via `mutate`. With it on, the extremely common
  // phone flow of "tap the WhatsApp FAB → send a message → switch back to
  // the app" silently re-downloaded and re-rendered the whole dataset on
  // every return, which is exactly the kind of invisible lag that reads as
  // "this app feels slow."
  //
  // Cross-device sync (a second staff member's phone changing something)
  // used to be handled by a blind 2-minute poll. That's replaced below by a
  // Supabase Realtime subscription: data is used from memory indefinitely
  // and only re-fetched when a real change actually happens to this org's/
  // branch's rows, not on a guessed timer.
  const { data, mutate } = useSWR(
    activeBranchId && orgId ? (['shop-bundle', activeBranchId, orgId] as const) : null,
    ([, branch, org]) => getShopBundle(branch, org),
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Push-based invalidation: any change to the active branch's orders/
  // profiles, or the org's customers (from this device or another),
  // re-fetches the bundle once, instead of polling on a timer regardless
  // of whether anything changed.
  useEffect(() => {
    if (!activeBranchId || !orgId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`shop-sync-${activeBranchId}-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${activeBranchId}` }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `org_id=eq.${orgId}` }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `shop_id=eq.${activeBranchId}` }, () => mutate())
      // Picks up the Paystack webhook flipping subscription_status once a
      // payment (popup or otherwise) actually clears — without this, the
      // in-app UI would keep showing "Free" until something else happened
      // to trigger a refetch, even though billing already activated.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shops', filter: `id=eq.${activeBranchId}` }, () => mutate())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBranchId, orgId, mutate]);

  const bundle = data ?? EMPTY_BUNDLE;
  const { orders, customers, staffMembers, shop: currentShop } = bundle;
  // Only true once we've never had data for this shop — a background
  // revalidation (isValidating) keeps showing the last-known-good data.
  const isLoaded = !!data;

  const addOrder = useCallback(
    async (orderData: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => {
      if (!activeBranchId) return;
      const updated = await addOrderAction(activeBranchId, orderData);
      mutate((current) => (current ? { ...current, orders: updated } : current), { revalidate: false });
    },
    [activeBranchId, mutate]
  );

  const addOrderBatch = useCallback(
    async (garments: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'>[]) => {
      if (!activeBranchId) return;
      const updated = await addOrderBatchAction(activeBranchId, garments);
      mutate((current) => (current ? { ...current, orders: updated } : current), { revalidate: false });
    },
    [activeBranchId, mutate]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => {
      if (!activeBranchId) return;
      await mutate(
        async (current) => {
          if (!current) return current;
          const updated = await updateOrderStatusAction(orderId, newStatus, changedBy, changedByName, activeBranchId);
          return { ...current, orders: updated };
        },
        {
          optimisticData: (current) => {
            const state = current || EMPTY_BUNDLE;
            return {
              ...state,
              orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
            };
          },
          rollbackOnError: true,
          revalidate: false,
        }
      );
    },
    [activeBranchId, mutate]
  );

  const updateOrder = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      if (!activeBranchId) return;
      await mutate(
        async (current) => {
          if (!current) return current;
          const updated = await updateOrderAction(orderId, updates, activeBranchId);
          return { ...current, orders: updated };
        },
        {
          optimisticData: (current) => {
            const state = current || EMPTY_BUNDLE;
            return {
              ...state,
              orders: state.orders.map((o) => (o.id === orderId ? { ...o, ...updates } : o)),
            };
          },
          rollbackOnError: true,
          revalidate: false,
        }
      );
    },
    [activeBranchId, mutate]
  );

  const addCustomer = useCallback(
    async (customerData: Omit<Customer, 'id' | 'shopId' | 'createdAt'>): Promise<Customer> => {
      if (!activeBranchId || !orgId) throw new Error('No active shop for the current user');
      const { newCustomer, customers: updated } = await addCustomerAction(activeBranchId, orgId, {
        ...customerData,
        whatsappNumber: normalizePhone(customerData.whatsappNumber),
      });
      mutate((current) => (current ? { ...current, customers: updated } : current), { revalidate: false });
      return newCustomer;
    },
    [activeBranchId, orgId, mutate]
  );

  const updateCustomerMeasurements = useCallback(
    async (customerId: string, measurements: Measurements) => {
      if (!orgId) return;
      await mutate(
        async (current) => {
          if (!current) return current;
          const updated = await updateCustomerMeasurementsAction(customerId, measurements, orgId);
          return { ...current, customers: updated };
        },
        {
          optimisticData: (current) => {
            const state = current || EMPTY_BUNDLE;
            return {
              ...state,
              customers: state.customers.map((c) =>
                c.id === customerId ? { ...c, measurements: { ...c.measurements, ...measurements } } : c
              ),
            };
          },
          rollbackOnError: true,
          revalidate: false,
        }
      );
    },
    [orgId, mutate]
  );

  const updateCustomerStyleProfile = useCallback(
    async (customerId: string, styleName: string, measurements: Measurements) => {
      if (!orgId) return;
      await mutate(
        async (current) => {
          if (!current) return current;
          const updated = await updateCustomerStyleProfileAction(customerId, styleName, measurements, orgId);
          return { ...current, customers: updated };
        },
        {
          optimisticData: (current) => {
            const state = current || EMPTY_BUNDLE;
            return {
              ...state,
              customers: state.customers.map((c) => {
                if (c.id !== customerId) return c;
                return {
                  ...c,
                  styleMeasurements: {
                    ...(c.styleMeasurements || {}),
                    [styleName]: { ...((c.styleMeasurements || {})[styleName] || {}), ...measurements },
                  },
                };
              }),
            };
          },
          rollbackOnError: true,
          revalidate: false,
        }
      );
    },
    [orgId, mutate]
  );

  const deleteCustomerStyleProfile = useCallback(
    async (customerId: string, styleName: string) => {
      if (!orgId) return;
      await mutate(
        async (current) => {
          if (!current) return current;
          const updated = await deleteCustomerStyleProfileAction(customerId, styleName, orgId);
          return { ...current, customers: updated };
        },
        {
          optimisticData: (current) => {
            const state = current || EMPTY_BUNDLE;
            return {
              ...state,
              customers: state.customers.map((c) => {
                if (c.id !== customerId) return c;
                const newProfiles = { ...(c.styleMeasurements || {}) };
                delete newProfiles[styleName];
                return { ...c, styleMeasurements: newProfiles };
              }),
            };
          },
          rollbackOnError: true,
          revalidate: false,
        }
      );
    },
    [orgId, mutate]
  );

  const updateCustomerProfile = useCallback(
    async (
      customerId: string,
      updates: Partial<Pick<Customer, 'fullName' | 'whatsappNumber' | 'gender' | 'preferredStyles' | 'address'>>
    ) => {
      if (!orgId) return;
      const normalized =
        updates.whatsappNumber !== undefined
          ? { ...updates, whatsappNumber: normalizePhone(updates.whatsappNumber) }
          : updates;

      await mutate(
        async (current) => {
          if (!current) return current;
          const updated = await updateCustomerProfileAction(customerId, normalized, orgId);
          if (updated) {
            return {
              ...current,
              customers: current.customers.map((c) => (c.id === customerId ? { ...c, ...updated } : c)),
            };
          }
          return current; // if update fails and doesn't throw, we could trigger a revalidate, but rollbackOnError expects a throw.
        },
        {
          optimisticData: (current) => {
            const state = current || EMPTY_BUNDLE;
            return {
              ...state,
              customers: state.customers.map((c) => (c.id === customerId ? { ...c, ...normalized } : c)),
            };
          },
          rollbackOnError: true,
          revalidate: false,
        }
      ).catch(() => mutate()); // Revalidate if action throws
    },
    [mutate, orgId]
  );

  const deleteCustomer = useCallback(
    async (customerId: string) => {
      mutate(
        (current) => {
          const state = current || EMPTY_BUNDLE;
          return {
            ...state,
            customers: state.customers.filter((c) => c.id !== customerId),
            orders: state.orders.filter((o) => o.customerId !== customerId),
          };
        },
        { revalidate: false }
      );

      const result = await deleteCustomerAction(customerId);
      if (result.error) {
        mutate();
      }
      return result;
    },
    [mutate]
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      mutate(
        (current) => {
          const state = current || EMPTY_BUNDLE;
          return {
            ...state,
            orders: state.orders.filter((o) => o.id !== orderId),
          };
        },
        { revalidate: false }
      );

      const result = await deleteOrderAction(orderId);
      if (result.error) {
        mutate();
      }
      return result;
    },
    [mutate]
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
    async (name: string, email: string, password: string, role: 'Staff' | 'BranchManager' | 'Accountant' = 'Staff') => {
      if (!activeBranchId) return;
      const { error } = await createStaffAccount(activeBranchId, name, email, password, role);
      if (error) throw new Error(error);
      const updated = await getStaff(activeBranchId);
      mutate((current) => (current ? { ...current, staffMembers: updated } : current), { revalidate: false });
    },
    [activeBranchId, mutate]
  );

  const updateStaff = useCallback(
    async (uid: string, updates: Partial<User>) => {
      if (!activeBranchId) return;
      const updated = await updateStaffAction(uid, updates, activeBranchId);
      mutate((current) => (current ? { ...current, staffMembers: updated } : current), { revalidate: false });
    },
    [activeBranchId, mutate]
  );

  const updateShop = useCallback(
    async (updates: Partial<Shop>) => {
      if (!activeBranchId) return;
      const updated = await updateShopAction(activeBranchId, updates);
      mutate((current) => (current ? { ...current, shop: updated } : current), { revalidate: false });
    },
    [activeBranchId, mutate]
  );

  const upsertCustomStyle = useCallback(
    async (
      name: string,
      photoUrl?: string,
      measurementFields?: { id: string; label: string }[],
      gender?: 'male' | 'female'
    ) => {
      if (!activeBranchId) return;
      const updated = await upsertCustomStyleAction(activeBranchId, name, photoUrl, measurementFields, gender);
      mutate((current) => (current ? { ...current, shop: updated } : current), { revalidate: false });
    },
    [activeBranchId, mutate]
  );

  const renameCustomStyle = useCallback(
    async (oldName: string, newName: string) => {
      if (!activeBranchId) return;
      const updated = await renameCustomStyleEverywhereAction(activeBranchId, oldName, newName);
      mutate(
        (current) =>
          current
            ? {
                ...current,
                shop: updated,
                customers: current.customers.map((c) =>
                  c.preferredStyles?.includes(oldName)
                    ? { ...c, preferredStyles: c.preferredStyles.map((s) => (s === oldName ? newName : s)) }
                    : c
                ),
              }
            : current,
        { revalidate: false }
      );
    },
    [activeBranchId, mutate]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      orders,
      customers,
      staffMembers,
      shops: branches,
      currentShop,
      activeBranchId,
      setActiveBranchId,
      refreshBranches,
      refreshShop: mutate,
      isLoaded,
      addOrder,
      addOrderBatch,
      updateOrderStatus,
      updateOrder,
      deleteOrder,
      addCustomer,
      updateCustomerMeasurements,
      updateCustomerStyleProfile,
      deleteCustomerStyleProfile,
      updateCustomerProfile,
      deleteCustomer,
      getCustomerOrders,
      getOrdersByStatus,
      getOrdersByStaff,
      findOrCreateCustomer,
      addStaff,
      updateStaff,
      updateShop,
      upsertCustomStyle,
      renameCustomStyle,
    }),
    [orders, customers, staffMembers, branches, currentShop, activeBranchId, setActiveBranchId, refreshBranches, mutate, isLoaded, addOrder, addOrderBatch, updateOrderStatus, updateOrder, addCustomer, updateCustomerMeasurements, updateCustomerStyleProfile, deleteCustomerStyleProfile, updateCustomerProfile, getCustomerOrders, getOrdersByStatus, getOrdersByStaff, findOrCreateCustomer, addStaff, updateStaff, updateShop, upsertCustomStyle, renameCustomStyle]
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
