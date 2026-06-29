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
import type { Order, Customer, OrderStatus, StatusChange, Measurements } from '@/lib/types';
import { MOCK_USERS } from '@/lib/mockData';
import { normalizePhone } from '@/lib/formatters';
import {
  getDatabase,
  addOrderAction,
  updateOrderStatusAction,
  updateOrderAction,
  addCustomerAction,
  updateCustomerMeasurementsAction
} from '@/app/actions';

interface DataContextValue {
  orders: Order[];
  customers: Customer[];
  staffMembers: typeof MOCK_USERS;
  isLoaded: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomerMeasurements: (customerId: string, measurements: Measurements) => Promise<void>;
  getCustomerOrders: (customerId: string) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersByStaff: (staffUid: string) => Order[];
  findOrCreateCustomer: (fullName: string, whatsappNumber: string) => Promise<Customer>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getDatabase().then(db => {
      setOrders(db.orders);
      setCustomers(db.customers);
      setIsLoaded(true);
    });
  }, []);


  const addOrder = useCallback(
    async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newOrder: Order = {
        ...orderData,
        id: `ord-${Date.now()}`,
        statusHistory: orderData.statusHistory || [],
        createdAt: now,
        updatedAt: now,
      };
      
      // Optimistic update
      setOrders(prev => [newOrder, ...prev]);
      
      const updatedDb = await addOrderAction(newOrder);
      setOrders(updatedDb.orders);
    },
    []
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      const customer = customers.find(c => c.id === order.customerId);
      
      // Optimistic update
      setOrders(prev => prev.map(o => {
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
      setOrders(updatedDb.orders);
    },
    [orders, customers]
  );

  const updateOrder = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o));
      
      // Persist
      const updatedDb = await updateOrderAction(orderId, updates);
      setOrders(updatedDb.orders);
    },
    []
  );

  const addCustomer = useCallback(
    async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
      const newCustomer: Customer = {
        ...customerData,
        whatsappNumber: normalizePhone(customerData.whatsappNumber),
        id: `cust-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      // Optimistic
      setCustomers(prev => [newCustomer, ...prev]);
      
      // Persist
      const updatedDb = await addCustomerAction(newCustomer);
      setCustomers(updatedDb.customers);
      return newCustomer;
    },
    []
  );

  const updateCustomerMeasurements = useCallback(
    async (customerId: string, measurements: Measurements) => {
      // Optimistic
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, measurements } : c));
      
      // Persist
      const updatedDb = await updateCustomerMeasurementsAction(customerId, measurements);
      setCustomers(updatedDb.customers);
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

  const value = useMemo<DataContextValue>(
    () => ({
      orders,
      customers,
      staffMembers: MOCK_USERS,
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
    }),
    [orders, customers, isLoaded, addOrder, updateOrderStatus, updateOrder, addCustomer, updateCustomerMeasurements, getCustomerOrders, getOrdersByStatus, getOrdersByStaff, findOrCreateCustomer]
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
