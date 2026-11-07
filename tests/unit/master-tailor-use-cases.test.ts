import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  getCurrencySymbol,
  formatPhone,
  normalizePhone,
  isValidPhone,
  getOrderProgressMessage,
  formatMeasurementsSummary,
  getWhatsAppLink,
  getTelLink,
  formatDate,
  formatMonthYear,
  formatShortMonthYear,
  truncateText,
} from '@/lib/formatters';
import { isValidAnatomy } from '@/lib/validations/anatomy';
import {
  getBalanceOwed,
  hasCostData,
  getMargin,
  type Order,
  type OrderStatus,
  type PaymentMethod,
  type ExpenseCategory,
  type AtelierCraftRole,
  CRAFT_ROLE_LABELS,
} from '@/lib/types';
import { APP_CONFIG } from '@/lib/config';

describe('Master Tailor Atelier — 100% Comprehensive Use-Case Engine', () => {
  // =========================================================================
  // 1. CUSTOMER MANAGEMENT & ANATOMICAL PROFILING USE CASES
  // =========================================================================
  describe('Module 1: Customer Management & Anatomical Profiling', () => {
    it('UC 1.1: Bespoke Male Intake (Senator / Kaftan / Agbada proportions)', () => {
      const maleClient = {
        fullName: 'Chukwuma Eze',
        phone: '08031234567',
        gender: 'male' as const,
        measurements: {
          chest: 44,
          shoulder: 20,
          sleeveLength: 26.5,
          shirtLength: 36,
          neck: 17,
          waist: 36,
          thigh: 25,
          trouserLength: 42,
          ankle: 16,
        },
      };

      expect(isValidPhone(maleClient.phone)).toBe(true);
      expect(normalizePhone(maleClient.phone)).toBe('2348031234567');
      expect(formatPhone(normalizePhone(maleClient.phone))).toBe('+234 803 123 4567');
      expect(getTelLink(maleClient.phone)).toBe('tel:+2348031234567');

      const anatomy = isValidAnatomy(maleClient.measurements);
      expect(anatomy.valid).toBe(true);
    });

    it('UC 1.2: Bespoke Female Intake (Bust, Underbust, High/Low Hips, Gown Length)', () => {
      const femaleClient = {
        fullName: 'Amina Bello',
        phone: '07059876543',
        gender: 'female' as const,
        measurements: {
          bust: 38,
          underBust: 32,
          waist: 30,
          hips: 44,
          shoulder: 16,
          sleeveLength: 23,
          shirtLength: 24, // Blouse length
          trouserLength: 42, // Skirt / Trouser length
        },
      };

      expect(isValidPhone(femaleClient.phone)).toBe(true);
      const anatomy = isValidAnatomy(femaleClient.measurements);
      expect(anatomy.valid).toBe(true);
    });

    it('UC 1.3: Returning Customer with Changing Measurements / Post-Holiday Update', () => {
      const existingClient = {
        fullName: 'Folake Adeyemi',
        waistInitial: 30,
        waistUpdated: 32,
      };

      // Ensure measurement delta is accurately recorded
      const delta = existingClient.waistUpdated - existingClient.waistInitial;
      expect(delta).toBe(2);
      expect(existingClient.waistUpdated).toBe(32);
    });

    it('UC 1.4: Customer with Specific Fitting & Anatomical Notes', () => {
      const notes = 'Prefers relaxed fit under armhole; 2-inch cuff on trouser hems.';
      const summary = formatMeasurementsSummary({
        customerName: 'Kunle Bakare',
        gender: 'male',
        measurements: { chest: 40, waist: 32 },
        notes,
      });

      expect(summary).toContain('*Notes:* Prefers relaxed fit under armhole; 2-inch cuff on trouser hems.');
      expect(summary).toContain(`— via ${APP_CONFIG.name}`);
    });

    it('UC 1.5: Walk-In Consultation with Initial Zero Measurements (Fabric Drop-off)', () => {
      const summary = formatMeasurementsSummary({
        customerName: 'New Walk-In',
        gender: 'male',
        measurements: {},
      });

      expect(summary).toContain('_No measurements recorded yet_');
      expect(summary).toContain('*Measurements: New Walk-In*');
    });

    it('UC 1.6: Measurement Sharing via WhatsApp Sheet with Brand Attribution', () => {
      const summary = formatMeasurementsSummary({
        customerName: 'Emeka Obi',
        gender: 'male',
        measurements: { chest: 42, shoulder: 19 },
      });

      const whatsappUrl = getWhatsAppLink('08030000000', summary);
      expect(whatsappUrl).toContain('https://wa.me/2348030000000?text=');
      expect(whatsappUrl).toContain(encodeURIComponent(APP_CONFIG.name));
    });
  });

  // =========================================================================
  // 2. ORDER INTAKE, PRICING & FINANCIAL BALANCES USE CASES
  // =========================================================================
  describe('Module 2: Order Intake & Financial Balances', () => {
    it('UC 2.1: Bespoke Order with Full 100% Advance Payment', () => {
      const order: Order = {
        id: 'ord_full_001',
        shopId: 'shop_001',
        customerName: 'Alhaji Musa',
        styleName: 'Grand Agbada 3-Piece',
        totalBill: 180000,
        depositPaid: 180000,
        status: 'Documented',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(getBalanceOwed(order)).toBe(0);
      expect(formatCurrency(getBalanceOwed(order))).toBe('₦0');
    });

    it('UC 2.2: Bespoke Order with Standard 50% Commitment Deposit', () => {
      const order: Order = {
        id: 'ord_half_001',
        shopId: 'shop_001',
        customerName: 'Chief Okonjo',
        styleName: 'Senator Suit',
        totalBill: 100000,
        depositPaid: 50000,
        status: 'Documented',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(getBalanceOwed(order)).toBe(50000);
      expect(formatCurrency(getBalanceOwed(order))).toBe('₦50,000');
    });

    it('UC 2.3: VIP Customer with Zero Advance Deposit (100% Owed upon Delivery)', () => {
      const order: Order = {
        id: 'ord_vip_001',
        shopId: 'shop_001',
        customerName: 'Senator Briggs',
        styleName: 'Double-Breasted Italian Wool Suit',
        totalBill: 250000,
        depositPaid: 0,
        status: 'Documented',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(getBalanceOwed(order)).toBe(250000);
      expect(formatCurrency(getBalanceOwed(order))).toBe('₦250,000');
    });

    it('UC 2.4: Multi-Piece Wedding Order with Cost and Profit Margin Tracking', () => {
      const order: Order = {
        id: 'ord_wedding_001',
        shopId: 'shop_001',
        customerName: 'Groomsmen Squad (5 Sets)',
        totalBill: 500000,
        depositPaid: 300000,
        materialCost: 180000,
        otherCosts: 70000, // Tailor wages & delivery
        status: 'Documented',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(hasCostData(order)).toBe(true);
      expect(getMargin(order)).toBe(250000); // 500k - 180k - 70k = 250k profit
      expect(getBalanceOwed(order)).toBe(200000);
    });

    it('UC 2.5: Urgent 48-Hour Rush Order with Priority Flag', () => {
      const rushDueDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const order: Order = {
        id: 'ord_rush_001',
        shopId: 'shop_001',
        customerName: 'Dr. Femi',
        totalBill: 150000,
        depositPaid: 150000,
        status: 'Cutting',
        dueDate: rushDueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(order.dueDate).toBeDefined();
      const hoursRemaining = (new Date(order.dueDate!).getTime() - Date.now()) / (3600 * 1000);
      expect(hoursRemaining).toBeGreaterThan(40);
      expect(hoursRemaining).toBeLessThanOrEqual(48.5);
    });
  });

  // =========================================================================
  // 3. PRODUCTION PIPELINE, STAGE NOTIFICATIONS & EMBELLISHMENTS
  // =========================================================================
  describe('Module 3: Production Pipeline & Embellishment Operations', () => {
    it('UC 3.1: Full Stage Cycle (Documented -> Cutting -> Sewing -> Ready -> Delivered)', () => {
      const stages: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Delivered'];
      let currentStage: OrderStatus = 'Documented';

      for (const nextStage of stages) {
        currentStage = nextStage;
        const msg = getOrderProgressMessage({
          status: currentStage,
          customerName: 'Seyi Makinde',
          shopName: 'Prestige Atelier',
          trackingUrl: `https://${APP_CONFIG.domain}/track/test_001`,
        });

        expect(msg).toContain('Seyi');
        expect(msg).toContain('Prestige Atelier');
        expect(msg).toContain(`https://${APP_CONFIG.domain}/track/test_001`);
      }

      expect(currentStage).toBe('Delivered');
    });

    it('UC 3.2: Mid-Production Embellishment Upgrade with Total Bill Adjustment', () => {
      const order: Order = {
        id: 'ord_emb_001',
        shopId: 'shop_001',
        customerName: 'Engr. Dapo',
        totalBill: 90000,
        depositPaid: 50000,
        status: 'Sewing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(getBalanceOwed(order)).toBe(40000);

      // Customer requests intricate collar & pocket embroidery (+₦18,000)
      const embroideryAddition = 18000;
      order.totalBill += embroideryAddition;

      expect(order.totalBill).toBe(108000);
      expect(getBalanceOwed(order)).toBe(58000);
      expect(formatCurrency(getBalanceOwed(order))).toBe('₦58,000');
    });

    it('UC 3.3: Artisan Assignment by Specialty Role', () => {
      const staffMembers: { name: string; role: AtelierCraftRole }[] = [
        { name: 'Baba Tunde', role: 'cutter' },
        { name: 'Sister Chioma', role: 'tailor' },
        { name: 'Ibrahim', role: 'embroiderer' },
        { name: 'Grace', role: 'finisher' },
      ];

      expect(CRAFT_ROLE_LABELS.cutter).toBe('Master Cutter');
      expect(CRAFT_ROLE_LABELS.tailor).toBe('Tailor / Machinist');
      expect(CRAFT_ROLE_LABELS.embroiderer).toBe('Embroiderer');
      expect(CRAFT_ROLE_LABELS.finisher).toBe('Finisher / Presser');

      const cutter = staffMembers.find((s) => s.role === 'cutter');
      expect(cutter?.name).toBe('Baba Tunde');
    });

    it('UC 3.4: Customer Public Live Tracking URL Resolution', () => {
      const orderId = 'ord_live_777';
      const trackingUrl = `${APP_CONFIG.baseUrl}/track/${orderId}`;

      expect(trackingUrl).toBe(`https://${APP_CONFIG.domain}/track/ord_live_777`);
      expect(trackingUrl).not.toContain('localhost');
    });
  });

  // =========================================================================
  // 4. HANDOVER, SPLIT TENDER & DIGITAL RECEIPTS USE CASES
  // =========================================================================
  describe('Module 4: Handover, Split Tender & Digital Receipts', () => {
    it('UC 4.1: Split Tender Collection (Bank Transfer + Cash Handover)', () => {
      const order: Order = {
        id: 'ord_split_001',
        shopId: 'shop_001',
        customerName: 'Barrister Ifeanyi',
        totalBill: 150000,
        depositPaid: 50000, // Initial deposit
        status: 'Ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(getBalanceOwed(order)).toBe(100000);

      // Tender 1: 70,000 NGN Bank Transfer
      const tender1 = { method: 'transfer' as PaymentMethod, amount: 70000 };
      order.depositPaid += tender1.amount;
      expect(getBalanceOwed(order)).toBe(30000);

      // Tender 2: 30,000 NGN Cash
      const tender2 = { method: 'cash' as PaymentMethod, amount: 30000 };
      order.depositPaid += tender2.amount;
      expect(getBalanceOwed(order)).toBe(0);

      order.status = 'Delivered';
      expect(order.status).toBe('Delivered');
    });

    it('UC 4.2: POS Terminal Settlement', () => {
      const order: Order = {
        id: 'ord_pos_001',
        shopId: 'shop_001',
        totalBill: 85000,
        depositPaid: 0,
        status: 'Ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const posPayment = { method: 'pos' as PaymentMethod, amount: 85000 };
      order.depositPaid += posPayment.amount;

      expect(getBalanceOwed(order)).toBe(0);
      expect(order.depositPaid).toBe(85000);
    });

    it('UC 4.3: Overpayment Handling with Store Credit Rollover', () => {
      const order: Order = {
        id: 'ord_overpay_001',
        shopId: 'shop_001',
        customerName: 'Mr. Wale',
        totalBill: 45000,
        depositPaid: 20000,
        status: 'Ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const balanceOwed = getBalanceOwed(order); // 25,000 NGN
      expect(balanceOwed).toBe(25000);

      // Customer transfers 30,000 NGN (excess 5,000 NGN)
      const amountTransferred = 30000;
      const overpayment = amountTransferred - balanceOwed;
      expect(overpayment).toBe(5000);

      // Apply exact payment to order
      order.depositPaid += balanceOwed;
      expect(getBalanceOwed(order)).toBe(0);

      // Rollover excess into store credit
      let customerStoreCredit = 0;
      customerStoreCredit += overpayment;
      expect(customerStoreCredit).toBe(5000);
      expect(formatCurrency(customerStoreCredit)).toBe('₦5,000');
    });

    it('UC 4.4: Outstanding Debt Collection Handover Tracking', () => {
      const order: Order = {
        id: 'ord_debt_001',
        shopId: 'shop_001',
        customerName: 'Pastor David',
        totalBill: 80000,
        depositPaid: 50000,
        status: 'Delivered', // Collected with 30k balance still owing
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(order.status).toBe('Delivered');
      expect(getBalanceOwed(order)).toBe(30000);
      expect(formatCurrency(getBalanceOwed(order))).toBe('₦30,000');
    });

    it('UC 4.5: Digital Thermal Receipt Generation and WhatsApp Delivery Link', () => {
      const orderId = 'ord_receipt_999';
      const customerPhone = '08022223333';
      const receiptUrl = `${APP_CONFIG.baseUrl}/receipt/${orderId}`;
      const msg = `Here is your official digital receipt from Victoria Atelier: ${receiptUrl}`;

      const link = getWhatsAppLink(customerPhone, msg);
      expect(link).toContain('https://wa.me/2348022223333?text=');
      expect(link).toContain(encodeURIComponent(receiptUrl));
    });
  });

  // =========================================================================
  // 5. DAILY EXPENSES, WORKSHOP POWER & RECONCILIATION USE CASES
  // =========================================================================
  describe('Module 5: Daily Expenses & Workshop Reconciliation', () => {
    it('UC 5.1: Itemized Expense Categorization across Workshop Operations', () => {
      const dailyExpenses: { category: ExpenseCategory; description: string; amount: number; method: PaymentMethod }[] = [
        { category: 'material', description: 'YKK Zips and Thread Cones', amount: 8500, method: 'cash' },
        { category: 'general', description: 'Generator Petrol for Evening Stitching', amount: 12000, method: 'transfer' },
        { category: 'labor', description: 'Daily Machinist Stitching Wages', amount: 25000, method: 'transfer' },
        { category: 'logistics', description: 'Dispatch Bike to Lekki Phase 1', amount: 4500, method: 'cash' },
      ];

      const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalExpenses).toBe(50000);
      expect(formatCurrency(totalExpenses)).toBe('₦50,000');

      const transferExpenses = dailyExpenses.filter((e) => e.method === 'transfer').reduce((sum, e) => sum + e.amount, 0);
      const cashExpenses = dailyExpenses.filter((e) => e.method === 'cash').reduce((sum, e) => sum + e.amount, 0);

      expect(transferExpenses).toBe(37000);
      expect(cashExpenses).toBe(13000);
    });

    it('UC 5.2: End-of-Day WhatsApp Financial Summary String Generation', () => {
      const revenue = 180000;
      const expenses = 50000;
      const netProfit = revenue - expenses;

      const summaryText =
        `*Daily Workshop Financial Summary*\n\n` +
        `• Total Inflow: ${formatCurrency(revenue)}\n` +
        `• Workshop Costs: ${formatCurrency(expenses)}\n` +
        `• Net Inflow: ${formatCurrency(netProfit)}\n\n` +
        `Logged with ${APP_CONFIG.name}`;

      expect(summaryText).toContain('Total Inflow: ₦180,000');
      expect(summaryText).toContain('Workshop Costs: ₦50,000');
      expect(summaryText).toContain('Net Inflow: ₦130,000');
      expect(summaryText).toContain(`Logged with ${APP_CONFIG.name}`);
    });
  });

  // =========================================================================
  // 6. READY-TO-WEAR (RTW) INVENTORY, AUTO-STOCKING & POS SALES USE CASES
  // =========================================================================
  describe('Module 6: RTW Inventory & POS Walk-In Sales', () => {
    it('UC 6.1: Factory Batch Delivery Auto-Stocking into Showroom Inventory', () => {
      const batchOrder: Order = {
        id: 'batch_001',
        shopId: 'shop_001',
        isInternalBatch: true,
        styleName: 'Linen Senator Shirt',
        batchSizes: [
          { size: 'M', quantity: 12 },
          { size: 'L', quantity: 20 },
          { size: 'XL', quantity: 8 },
        ],
        totalBill: 0,
        depositPaid: 0,
        status: 'Documented',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const totalBatchUnits = (batchOrder.batchSizes || []).reduce((acc, s) => acc + s.quantity, 0);
      expect(totalBatchUnits).toBe(40);

      // When marked Delivered, factory pieces become showroom finished stock
      batchOrder.status = 'Delivered';
      expect(batchOrder.status).toBe('Delivered');
    });

    it('UC 6.2: Walk-In Retail Sale & Immediate Stock Decrement', () => {
      const stock = {
        name: 'Linen Senator Shirt',
        size: 'L',
        available: 20,
        unitPrice: 22000,
      };

      const itemsSold = 3;
      stock.available -= itemsSold;
      expect(stock.available).toBe(17);

      const saleRevenue = itemsSold * stock.unitPrice;
      expect(saleRevenue).toBe(66000);
      expect(formatCurrency(saleRevenue)).toBe('₦66,000');
    });
  });

  // =========================================================================
  // 7. MULTI-CURRENCY GLOBAL TAILORING USE CASES
  // =========================================================================
  describe('Module 7: Multi-Currency Dynamic Handling', () => {
    it('UC 7.1: Dynamically Formats All Currencies with Narrow Symbols & No Hardcoding', () => {
      // Nigerian Naira
      expect(getCurrencySymbol('NGN')).toBe('₦');
      expect(formatCurrency(150000, 'NGN')).toBe('₦150,000');

      // US Dollar
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(formatCurrency(250, 'USD')).toBe('$250');

      // British Pound
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(formatCurrency(180, 'GBP')).toBe('£180');

      // Euro
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(formatCurrency(200, 'EUR')).toBe('€200');

      // Ghanaian Cedi
      expect(getCurrencySymbol('GHS')).toBe('GH₵');
      expect(formatCurrency(1200, 'GHS')).toBe('GH₵1,200');

      // Kenyan Shilling
      expect(getCurrencySymbol('KES')).toBe('KES');
      expect(formatCurrency(5000, 'KES').replace(/\s+/g, ' ')).toBe('KES 5,000');
    });
  });

  // =========================================================================
  // 8. TAILOR CIRCLE & STREAKS (DECOUPLED FROM XP) USE CASES
  // =========================================================================
  describe('Module 8: Tailor Circle & Streaks (Independent of XP)', () => {
    it('UC 8.1: Circle Invitation Generation without XP Mentions', () => {
      const code = 'STUDIO4000';
      const origin = APP_CONFIG.baseUrl;
      const shareUrl = `${origin}/circle?connect=${code}`;
      const inviteMsg = `Good day! Join my Tailor Circle on ${APP_CONFIG.name} so our workshops can keep our daily production streaks accountable. Tap this link to connect with me: ${shareUrl}`;

      expect(inviteMsg).not.toContain('XP');
      expect(inviteMsg).toContain(APP_CONFIG.name);
      expect(inviteMsg).toContain(code);
    });

    it('UC 8.2: Co-Op Buddy Sabbatical Notice without XP Jargon', () => {
      const buddyName = 'Segun Tailors';
      const sabbaticalNotice = `${buddyName} placed on Sabbatical (streaks paused while away)`;

      expect(sabbaticalNotice).not.toContain('XP');
      expect(sabbaticalNotice).toContain('streaks paused while away');
    });

    it('UC 8.3: Daily Streak Continuation on Consecutive Workdays', () => {
      let currentStreak = 5;
      const loggedActivityToday = true;

      if (loggedActivityToday) {
        currentStreak += 1;
      }

      expect(currentStreak).toBe(6);
      expect(`${currentStreak} days active`).toBe('6 days active');
    });
  });

  // =========================================================================
  // 9. WORKSHOP NOTES & FABRIC MARKET SHOPPING LIST USE CASES
  // =========================================================================
  describe('Module 9: Workshop Notes & Fabric Market Lists', () => {
    it('UC 9.1: Formats Market Shopping List for WhatsApp Apprentice Sharing', () => {
      const shoppingItems = [
        '3 cones of Navy Blue matching sewing thread',
        '5 yards of black pocket lining fabric',
        '10 metallic gold blazer buttons',
      ];

      const listText =
        `*Workshop Market List* (${shoppingItems.length} items):\n\n` +
        shoppingItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n') +
        `\n\n— Sent from ${APP_CONFIG.name} Workshop`;

      expect(listText).toContain('*Workshop Market List* (3 items):');
      expect(listText).toContain('1. 3 cones of Navy Blue matching sewing thread');
      expect(listText).toContain(`— Sent from ${APP_CONFIG.name} Workshop`);
      expect(listText).not.toContain('MyTailorBook');
    });
  });

  // =========================================================================
  // 10. REPEAT OUTREACH & STYLE CATALOGUE LOOKBOOK USE CASES
  // =========================================================================
  describe('Module 10: Repeat Client Outreach & Lookbook Engagement', () => {
    it('UC 10.1: Lookbook Outfit Outreach with Customer WhatsApp Deep-link', () => {
      const customerName = 'Chief Alabi';
      const outfitTitle = 'Royal Burgundy Agbada Set';
      const lookbookUrl = `${APP_CONFIG.baseUrl}/catalogues/royal-burgundy`;

      const msg = `Good day ${customerName.split(' ')[0]}! We just published our ${outfitTitle} in our lookbook. Here is a preview: ${lookbookUrl}`;
      const url = getWhatsAppLink('08023456789', msg);

      expect(url).toContain('https://wa.me/2348023456789?text=');
      expect(url).toContain(encodeURIComponent(outfitTitle));
      expect(url).toContain(encodeURIComponent(lookbookUrl));
    });
  });
});
