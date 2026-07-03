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
import { MOCK_USERS, MOCK_SHOPS } from '@/lib/mockData';
import { normalizePhone } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDatabase,
  addOrderAction,
  updateOrderStatusAction,
  updateOrderAction,
  addCustomerAction,
  updateCustomerMeasurementsAction,
  addStaffAction,
  updateStaffAction,
  updateShopAction,
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
  addStaff: (name: string, email: string) => Promise<void>;
  updateStaff: (uid: string, updates: Partial<User>) => Promise<void>;
  updateShop: (updates: Partial<Shop>) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getDatabase().then(db => {
      setAllOrders(db.orders);
      setAllCustomers(db.customers);
      setAllStaff(db.users || MOCK_USERS);
      setShops(db.shops || MOCK_SHOPS);
      setIsLoaded(true);
    });
  }, []);

  // Every read is scoped to the logged-in user's shop — this is the client-side
  // stand-in for what Supabase row-level security will enforce per tenant.
  const shopId = user?.shopId;
  const orders = useMemo(() => allOrders.filter(o => o.shopId === shopId), [allOrders, shopId]);
  const customers = useMemo(() => allCustomers.filter(c => c.shopId === shopId), [allCustomers, shopId]);
  const staffMembers = useMemo(() => allStaff.filter(s => s.shopId === shopId), [allStaff, shopId]);
  const currentShop = useMemo(() => shops.find(s => s.id === shopId) || null, [shops, shopId]);

  const addOrder = useCallback(
    async (orderData: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => {
      if (!shopId) return;
      const now = new Date().toISOString();
      const newOrder: Order = {
        ...orderData,
        id: `ord-${Date.now()}`,
        shopId,
        statusHistory: orderData.statusHistory || [],
        createdAt: now,
        updatedAt: now,
      };

      // Optimistic update
      setAllOrders(prev => [newOrder, ...prev]);

      const updatedDb = await addOrderAction(newOrder);
      setAllOrders(updatedDb.orders);
    },
    [shopId]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => {
      const order = allOrders.find(o => o.id === orderId);
      if (!order) return;

      // Optimistic update
      setAllOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          statusHistory: [...o.statusHistory, {
            from: o.status,
            to: newStatus,
            changedBy,
            changedByName,
            timestamp: new Date().toISOString(),
          }]
        };
      }));

      // Persist
      const updatedDb = await updateOrderStatusAction(orderId, newStatus, changedBy, changedByName);
      setAllOrders(updatedDb.orders);
    },
    [allOrders]
  );

  const updateOrder = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      // Optimistic update
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o));

      // Persist
      const updatedDb = await updateOrderAction(orderId, updates);
      setAllOrders(updatedDb.orders);
    },
    []
  );

  const addCustomer = useCallback(
    async (customerData: Omit<Customer, 'id' | 'shopId' | 'createdAt'>): Promise<Customer> => {
      if (!shopId) throw new Error('No active shop for the current user');
      const newCustomer: Customer = {
        ...customerData,
        whatsappNumber: normalizePhone(customerData.whatsappNumber),
        id: `cust-${Date.now()}`,
        shopId,
        createdAt: new Date().toISOString(),
      };

      // Optimistic
      setAllCustomers(prev => [newCustomer, ...prev]);

      // Persist
      const updatedDb = await addCustomerAction(newCustomer);
      setAllCustomers(updatedDb.customers);
      return newCustomer;
    },
    [shopId]
  );

  const updateCustomerMeasurements = useCallback(
    async (customerId: string, measurements: Measurements) => {
      // Optimistic
      setAllCustomers(prev => prev.map(c => c.id === customerId ? { ...c, measurements } : c));

      // Persist
      const updatedDb = await updateCustomerMeasurementsAction(customerId, measurements);
      setAllCustomers(updatedDb.customers);
    },
    []
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
    (customerId: string): Order[] => {
      return orders.filter((o) => o.customerId === customerId);
    },
    [orders]
  );

  const getOrdersByStatus = useCallback(
    (status: OrderStatus): Order[] => {
      return orders.filter((o) => o.status === status);
    },
    [orders]
  );

  const getOrdersByStaff = useCallback(
    (staffUid: string): Order[] => {
      return orders.filter((o) => o.assignedTo === staffUid);
    },
    [orders]
  );

  const addStaff = useCallback(
    async (name: string, email: string) => {
      if (!shopId) return;
      const newStaff: User = {
        uid: `user-${Date.now()}`,
        name,
        email,
        role: 'Staff',
        shopId,
        createdAt: new Date().toISOString(),
      };

      setAllStaff(prev => [...prev, newStaff]);

      const updatedDb = await addStaffAction(newStaff);
      setAllStaff(updatedDb.users || []);
    },
    [shopId]
  );

  const updateStaff = useCallback(
    async (uid: string, updates: Partial<User>) => {
      setAllStaff(prev => prev.map(s => s.uid === uid ? { ...s, ...updates } : s));

      const updatedDb = await updateStaffAction(uid, updates);
      setAllStaff(updatedDb.users || []);
    },
    []
  );

  const updateShop = useCallback(
    async (updates: Partial<Shop>) => {
      if (!shopId) return;
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, ...updates } : s));

      const updatedDb = await updateShopAction(shopId, updates);
      setShops(updatedDb.shops || []);
    },
    [shopId]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      orders,
      customers,
      staffMembers,
      shops,
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
    [orders, customers, staffMembers, shops, currentShop, isLoaded, addOrder, updateOrderStatus, updateOrder, addCustomer, updateCustomerMeasurements, getCustomerOrders, getOrdersByStatus, getOrdersByStaff, findOrCreateCustomer, addStaff, updateStaff, updateShop]
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
