'use server';

import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import type { Order, Customer, OrderStatus, Measurements, User } from '@/lib/types';
import { MOCK_ORDERS, MOCK_CUSTOMERS, MOCK_USERS } from '@/lib/mockData';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  orders: Order[];
  customers: Customer[];
  users: User[];
}

// Ensure the DB exists
async function ensureDb(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data) as DatabaseSchema;
    if (!parsed.users) {
      parsed.users = MOCK_USERS;
      await fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (error) {
    const initialDb: DatabaseSchema = {
      orders: MOCK_ORDERS,
      customers: MOCK_CUSTOMERS,
      users: MOCK_USERS,
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
}

// ----------------------------------------------------------------------
// DATA ACTIONS
// ----------------------------------------------------------------------

export async function getDatabase() {
  return await ensureDb();
}

export async function saveDatabase(data: DatabaseSchema) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function addOrderAction(order: Order) {
  const db = await ensureDb();
  db.orders.unshift(order); // Add to top
  await saveDatabase(db);
  return db;
}

export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus, changedBy: string, changedByName: string) {
  const db = await ensureDb();
  const orderIndex = db.orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return db;

  const order = db.orders[orderIndex];
  order.statusHistory.push({
    from: order.status,
    to: newStatus,
    changedBy,
    changedByName,
    timestamp: new Date().toISOString(),
  });
  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  
  await saveDatabase(db);
  return db;
}

export async function updateOrderAction(orderId: string, updates: Partial<Order>) {
  const db = await ensureDb();
  const orderIndex = db.orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return db;

  db.orders[orderIndex] = { ...db.orders[orderIndex], ...updates, updatedAt: new Date().toISOString() };
  await saveDatabase(db);
  return db;
}

export async function addCustomerAction(customer: Customer) {
  const db = await ensureDb();
  db.customers.unshift(customer);
  await saveDatabase(db);
  return db;
}

export async function updateCustomerMeasurementsAction(customerId: string, measurements: Measurements) {
  const db = await ensureDb();
  const index = db.customers.findIndex(c => c.id === customerId);
  if (index !== -1) {
    db.customers[index].measurements = measurements;
    await saveDatabase(db);
  }
  return db;
}

export async function addStaffAction(user: User) {
  const db = await ensureDb();
  db.users.push(user);
  await saveDatabase(db);
  return db;
}



// ----------------------------------------------------------------------
// AUTH ACTIONS (Using Cookies)
// ----------------------------------------------------------------------

export async function loginAction(uid: string) {
  const cookieStore = await cookies();
  cookieStore.set('sf_session', uid, { 
    path: '/', 
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
  });
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('sf_session');
}

export async function getSessionAction() {
  const cookieStore = await cookies();
  return cookieStore.get('sf_session')?.value || null;
}
