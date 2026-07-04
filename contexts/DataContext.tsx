'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { Order, Customer, OrderStatus, Measurements, User, Shop } from '@/lib/types';
import { normalizePhone } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { createStaffAccount } from '@/app/auth-actions';
import {
  getShopBundle,
  addOrderAction,
  updateOrderStatusAction,
  updateOrderAction,
  addCustomerAction,
  updateCustomerMeasurementsAction,
  updateStaffAction,
  updateShopAction,
  getStaff,
} from '@/app/actions';

interface DataContextValue {
  orders: Order[];
  customers: Customer[];
  staffMembers: User[];
  shops: Shop[];
  currentShop: Shop | null;
  isLoaded: boolean;
  addOrder: (order: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'shopId' | 'createdAt'>) => Promise<Customer>;
  updateCustomerMeasurements: (customerId: string, measurements: Measurements) => Promise<void>;
  getCustomerOrders: (customerId: string) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersByStaff: (staffUid: string) => Order[];
  findOrCreateCustomer: (fullName: string, whatsappNumber: string) => Promise<Customer>;
  addStaff: (name: string, email: string, password: string) => Promise<void>;
  updateStaff: (uid: string, updates: Partial<User>) => Promise<void>;
  updateShop: (updates: Partial<Shop>) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Every read is now pre-scoped by the shopId column + Row Level Security —
  // Supabase itself refuses to hand back another shop's rows, so there's no
  // client-side filtering left to do (unlike the old db.json version).
  useEffect(() => {
    if (!shopId) {
      setOrders([]);
      setCustomers([]);
      setStaffMembers([]);
      setCurrentShop(null);
      setIsLoaded(false);
      return;
    }
    getShopBundle(shopId).then((bundle) => {
      setOrders(bundle.orders);
      setCustomers(bundle.customers);
      setStaffMembers(bundle.staffMembers);
      setCurrentShop(bundle.shop);
      setIsLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const addOrder = useCallback(
    async (orderData: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => {
      if (!shopId) return;
      const updated = await addOrderAction(shopId, orderData);
      setOrders(updated);
    },
    [shopId]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => {
      if (!shopId) return;
      const updated = await updateOrderStatusAction(orderId, newStatus, changedBy, changedByName, shopId);
      setOrders(updated);
    },
    [shopId]
  );

  const updateOrder = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      if (!shopId) return;
      const updated = await updateOrderAction(orderId, updates, shopId);
      setOrders(updated);
    },
    [shopId]
  );

  const addCustomer = useCallback(
    async (customerData: Omit<Customer, 'id' | 'shopId' | 'createdAt'>): Promise<Customer> => {
      if (!shopId) throw new Error('No active shop for the current user');
      const { newCustomer, customers: updated } = await addCustomerAction(shopId, {
        ...customerData,
        whatsappNumber: normalizePhone(customerData.whatsappNumber),
      });
      setCustomers(updated);
      return newCustomer;
    },
    [shopId]
  );

  const updateCustomerMeasurements = useCallback(
    async (customerId: string, measurements: Measurements) => {
      if (!shopId) return;
      const updated = await updateCustomerMeasurementsAction(customerId, measurements, shopId);
      setCustomers(updated);
    },
    [shopId]
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
      await createStaffAccount(shopId, name, email, password);
      const updated = await getStaff(shopId);
      setStaffMembers(updated);
    },
    [shopId]
  );

  const updateStaff = useCallback(
    async (uid: string, updates: Partial<User>) => {
      if (!shopId) return;
      const updated = await updateStaffAction(uid, updates, shopId);
      setStaffMembers(updated);
    },
    [shopId]
  );

  const updateShop = useCallback(
    async (updates: Partial<Shop>) => {
      if (!shopId) return;
      const updated = await updateShopAction(shopId, updates);
      setCurrentShop(updated);
    },
    [shopId]
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
      updateOrderStatus,
      updateOrder,
      addCustomer,
      updateCustomerMeasurements,
      getCustomerOrders,
      getOrdersByStatus,
      getOrdersByStaff,
      findOrCreateCustomer,
      addStaff,
      updateStaff,
      updateShop,
    }),
    [orders, customers, staffMembers, currentShop, isLoaded, addOrder, updateOrderStatus, updateOrder, addCustomer, updateCustomerMeasurements, getCustomerOrders, getOrdersByStatus, getOrdersByStaff, findOrCreateCustomer, addStaff, updateStaff, updateShop]
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
