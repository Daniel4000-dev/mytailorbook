import type { Order, Customer, User, ShopException } from '@/lib/types';

export const MOCK_STAFF: User[] = [
  {
    uid: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e',
    name: 'Daniel Adekunle',
    email: 'dadekunle31@gmail.com',
    role: 'OrgAdmin',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    orgId: 'c8d30370-75ab-43d5-8c3b-fafaf098ebb2',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'staff-emeka-01',
    name: 'Emeka Eze',
    email: 'emeka@atelier.test',
    role: 'Staff',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    orgId: 'c8d30370-75ab-43d5-8c3b-fafaf098ebb2',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'staff-blessing-02',
    name: 'Blessing Oladipo',
    email: 'blessing@atelier.test',
    role: 'Staff',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    orgId: 'c8d30370-75ab-43d5-8c3b-fafaf098ebb2',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'mock-cust-01',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Chief Adeleke Adeleke',
    whatsappNumber: '2348031234567',
    gender: 'male',
    preferredStyles: ['Agbada', 'Senator'],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'mock-cust-02',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Dr. Folashade Alakija',
    whatsappNumber: '2348029876543',
    gender: 'female',
    preferredStyles: ['Evening Gown', 'Corset Dress'],
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'mock-cust-03',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Senator Ken Nnamani',
    whatsappNumber: '2348055551234',
    gender: 'male',
    preferredStyles: ['Dinner Suit', 'Senator'],
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'mock-cust-04',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Hajiya Amina Bello',
    whatsappNumber: '2348081112233',
    gender: 'female',
    preferredStyles: ['Lace Peplum', 'Buba & Wrapper'],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'mock-cust-05',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Bankole Wellington',
    whatsappNumber: '2348064445566',
    gender: 'male',
    preferredStyles: ['Kaftan', 'Bespoke Suit'],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'mock-cust-06',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Tiwa Savage-Balogun',
    whatsappNumber: '2348077778899',
    gender: 'female',
    preferredStyles: ['Mermaid Dress', 'Aso-Ebi'],
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'mock-cust-07',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    fullName: 'Kunle Afolayan',
    whatsappNumber: '2348090001122',
    gender: 'male',
    preferredStyles: ['Senator', 'Kaftan'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const now = Date.now();
const oneDay = 86400000;

export const MOCK_ORDERS: Order[] = [
  // 1. Documented
  {
    id: 'mock-order-01',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-01',
    customerName: 'Chief Adeleke Adeleke',
    orderDetails: 'Royal Indigo Agbada with Hand-Embroidered Aso-Oke Chevrons',
    totalBill: 185000,
    depositPaid: 100000,
    status: 'Documented',
    dueDate: new Date(now + 5 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 2 * oneDay).toISOString() }
    ],
    payments: [
      { id: 'pay-01', amount: 100000, note: 'Initial 50% deposit via bank transfer', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 2 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 2 * oneDay).toISOString(),
    updatedAt: new Date(now - 2 * oneDay).toISOString(),
  },
  // 2. Documented (Urgent, Due Tomorrow)
  {
    id: 'mock-order-02',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-02',
    customerName: 'Dr. Folashade Alakija',
    orderDetails: 'Champagne Silk Corset Reception Gown with Feather Trim',
    totalBill: 240000,
    depositPaid: 150000,
    status: 'Documented',
    dueDate: new Date(now + 1 * oneDay).toISOString().split('T')[0],
    priority: 'urgent',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 1 * oneDay).toISOString() }
    ],
    payments: [
      { id: 'pay-02', amount: 150000, note: 'Deposit', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 1 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 1 * oneDay).toISOString(),
    updatedAt: new Date(now - 1 * oneDay).toISOString(),
  },
  // 3. Cutting (Assigned to Emeka)
  {
    id: 'mock-order-03',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-03',
    customerName: 'Senator Ken Nnamani',
    orderDetails: 'Emerald Velvet Double-Breasted Dinner Tuxedo',
    totalBill: 210000,
    depositPaid: 120000,
    status: 'Cutting',
    assignedTo: 'staff-emeka-01',
    assignedToName: 'Emeka Eze',
    dueDate: new Date(now + 4 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 3 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 1 * oneDay).toISOString() }
    ],
    payments: [
      { id: 'pay-03', amount: 120000, note: 'Card payment', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 3 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 3 * oneDay).toISOString(),
    updatedAt: new Date(now - 1 * oneDay).toISOString(),
  },
  // 4. Cutting (On Hold Exception + Assigned to Blessing)
  {
    id: 'mock-order-04',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-04',
    customerName: 'Hajiya Amina Bello',
    orderDetails: 'Ruby Red Chantilly Lace Peplum Blouse & Wrapper',
    totalBill: 130000,
    depositPaid: 70000,
    status: 'Cutting',
    assignedTo: 'staff-blessing-02',
    assignedToName: 'Blessing Oladipo',
    dueDate: new Date(now + 6 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 2 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-blessing-02', changedByName: 'Blessing Oladipo', timestamp: new Date(now - 12 * 3600000).toISOString() }
    ],
    payments: [
      { id: 'pay-04', amount: 70000, note: 'Deposit', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 2 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 2 * oneDay).toISOString(),
    updatedAt: new Date(now - 12 * 3600000).toISOString(),
  },
  // 5. Cutting (Batch item 1)
  {
    id: 'mock-order-05',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    isInternalBatch: true,
    batchId: 'rtw-batch-sand-01',
    customerName: 'Internal Production',
    orderDetails: 'Ready-To-Wear: Sand Linen Safari Jacket (Batch of 4)',
    totalBill: 160000,
    depositPaid: 160000,
    status: 'Cutting',
    assignedTo: 'staff-emeka-01',
    assignedToName: 'Emeka Eze',
    dueDate: new Date(now + 7 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    batchSizes: [
      { size: 'M', quantity: 2 },
      { size: 'L', quantity: 2 },
    ],
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 2 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 1 * oneDay).toISOString() }
    ],
    payments: [],
    createdAt: new Date(now - 2 * oneDay).toISOString(),
    updatedAt: new Date(now - 1 * oneDay).toISOString(),
  },
  // 6. Sewing (Rush, Overdue!)
  {
    id: 'mock-order-06',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-05',
    customerName: 'Bankole Wellington',
    orderDetails: 'Midnight Black Kaftan with Gold Collar Piping',
    totalBill: 110000,
    depositPaid: 60000,
    status: 'Sewing',
    assignedTo: 'staff-blessing-02',
    assignedToName: 'Blessing Oladipo',
    dueDate: new Date(now - 1 * oneDay).toISOString().split('T')[0], // Overdue by 1 day!
    priority: 'rush',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 5 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 4 * oneDay).toISOString() },
      { from: 'Cutting', to: 'Sewing', changedBy: 'staff-blessing-02', changedByName: 'Blessing Oladipo', timestamp: new Date(now - 2 * oneDay).toISOString() }
    ],
    payments: [
      { id: 'pay-06', amount: 60000, note: 'Deposit', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 5 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 5 * oneDay).toISOString(),
    updatedAt: new Date(now - 2 * oneDay).toISOString(),
  },
  // 7. Sewing (Due soon, Fully Paid, Assigned to Daniel)
  {
    id: 'mock-order-07',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-06',
    customerName: 'Tiwa Savage-Balogun',
    orderDetails: 'Gold Damask Aso-Ebi Mermaid Dress',
    totalBill: 195000,
    depositPaid: 195000, // Fully Paid!
    status: 'Sewing',
    assignedTo: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e',
    assignedToName: 'Daniel Adekunle',
    dueDate: new Date(now + 2 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 4 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 3 * oneDay).toISOString() },
      { from: 'Cutting', to: 'Sewing', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 1 * oneDay).toISOString() }
    ],
    payments: [
      { id: 'pay-07', amount: 195000, note: 'Full payment up-front', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 4 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 4 * oneDay).toISOString(),
    updatedAt: new Date(now - 1 * oneDay).toISOString(),
  },
  // 8. Sewing (Batch item 2)
  {
    id: 'mock-order-08',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    isInternalBatch: true,
    batchId: 'rtw-batch-sand-01',
    customerName: 'Internal Production',
    orderDetails: 'Ready-To-Wear: Sand Linen Trousers (Batch of 4)',
    totalBill: 120000,
    depositPaid: 120000,
    status: 'Sewing',
    assignedTo: 'staff-emeka-01',
    assignedToName: 'Emeka Eze',
    dueDate: new Date(now + 7 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    batchSizes: [
      { size: 'M', quantity: 2 },
      { size: 'L', quantity: 2 },
    ],
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 3 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 2 * oneDay).toISOString() },
      { from: 'Cutting', to: 'Sewing', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 1 * oneDay).toISOString() }
    ],
    payments: [],
    createdAt: new Date(now - 3 * oneDay).toISOString(),
    updatedAt: new Date(now - 1 * oneDay).toISOString(),
  },
  // 9. Ready (Fully Paid, Assigned to Daniel)
  {
    id: 'mock-order-09',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-07',
    customerName: 'Kunle Afolayan',
    orderDetails: 'Ivory & Bronze Brocade 3-Piece Senator Suit',
    totalBill: 160000,
    depositPaid: 160000, // Fully Paid!
    status: 'Ready',
    assignedTo: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e',
    assignedToName: 'Daniel Adekunle',
    dueDate: new Date(now).toISOString().split('T')[0],
    priority: 'normal',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 7 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 5 * oneDay).toISOString() },
      { from: 'Cutting', to: 'Sewing', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 3 * oneDay).toISOString() },
      { from: 'Sewing', to: 'Ready', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 4 * 3600000).toISOString() }
    ],
    payments: [
      { id: 'pay-09', amount: 160000, note: 'POS', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 7 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 7 * oneDay).toISOString(),
    updatedAt: new Date(now - 4 * 3600000).toISOString(),
  },
  // 10. Ready (Balance Due ₦80,000!)
  {
    id: 'mock-order-10',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    customerId: 'mock-cust-02',
    customerName: 'Dr. Folashade Alakija',
    orderDetails: 'Crimson Silk Corset Evening Dress with Gold Beadwork',
    totalBill: 180000,
    depositPaid: 100000, // ₦80k balance due
    status: 'Ready',
    assignedTo: 'staff-blessing-02',
    assignedToName: 'Blessing Oladipo',
    dueDate: new Date(now + 2 * oneDay).toISOString().split('T')[0],
    priority: 'normal',
    statusHistory: [
      { from: null, to: 'Documented', changedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', changedByName: 'Daniel Adekunle', timestamp: new Date(now - 6 * oneDay).toISOString() },
      { from: 'Documented', to: 'Cutting', changedBy: 'staff-emeka-01', changedByName: 'Emeka Eze', timestamp: new Date(now - 4 * oneDay).toISOString() },
      { from: 'Cutting', to: 'Sewing', changedBy: 'staff-blessing-02', changedByName: 'Blessing Oladipo', timestamp: new Date(now - 2 * oneDay).toISOString() },
      { from: 'Sewing', to: 'Ready', changedBy: 'staff-blessing-02', changedByName: 'Blessing Oladipo', timestamp: new Date(now - 6 * 3600000).toISOString() }
    ],
    payments: [
      { id: 'pay-10', amount: 100000, note: 'Deposit', recordedBy: 'f0c51a0c-6bfd-423b-a3db-7c4eca91875e', recordedByName: 'Daniel Adekunle', timestamp: new Date(now - 6 * oneDay).toISOString() }
    ],
    createdAt: new Date(now - 6 * oneDay).toISOString(),
    updatedAt: new Date(now - 6 * 3600000).toISOString(),
  },
];

export const MOCK_EXCEPTIONS: ShopException[] = [
  {
    id: 'mock-exc-01',
    shopId: '6bd33796-2464-43f9-b140-8f9af54e0699',
    orderId: 'mock-order-04',
    type: 'fabric_hold',
    reason: 'Awaiting customer confirmation on pearl button choice',
    startDate: new Date(now - 12 * 3600000).toISOString(),
    createdBy: 'staff-blessing-02',
    createdAt: new Date(now - 12 * 3600000).toISOString(),
  },
];
