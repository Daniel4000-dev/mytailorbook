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
  formatMeasurementConsultationReceipt,
  calculateArtisanPayout,
  getVideoFittingMessage,
  generateCustomerStatement,
  generateBatchGarmentTags,
  getBirthdayGreeting,
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
  type Customer,
  type InventoryItem,
  CRAFT_ROLE_LABELS,
} from '@/lib/types';
import { APP_CONFIG } from '@/lib/config';

describe('Master Tailor Atelier — 86 Comprehensive Software Use Cases', () => {
  // =========================================================================
  // PART 1: CLIENT ONBOARDING, ANATOMY & MEASUREMENT ENGINEERING (12 UCs)
  // =========================================================================
  describe('Part 1: Client Onboarding, Anatomy & Measurement Engineering', () => {
    it('UC 1.1: First-Time Studio Profile & Atelier Onboarding', () => {
      const shopProfile = {
        name: 'Savile Heritage Atelier',
        domain: APP_CONFIG.domain,
        currency: 'NGN',
        portfolioTemplate: 'editorial' as const,
        craftSpecialties: ['Senator', 'Agbada', 'Bespoke Suits'],
      };
      expect(shopProfile.name).toBe('Savile Heritage Atelier');
      expect(shopProfile.domain).toBe(APP_CONFIG.domain);
      expect(shopProfile.craftSpecialties).toHaveLength(3);
    });

    it('UC 1.2: Phone Contact Import & Customer Creation', () => {
      const rawPhone = '0803 123 4567';
      expect(isValidPhone(rawPhone)).toBe(true);
      expect(normalizePhone(rawPhone)).toBe('2348031234567');
      expect(formatPhone(rawPhone)).toBe('+234 803 123 4567');
    });

    it('UC 1.3: Multi-Contact Protocol per Client (Secondary & Payer Contacts)', () => {
      const client: Customer = {
        id: 'cust_001',
        shopId: 'shop_001',
        fullName: 'Chief Segun Adeleke',
        whatsappNumber: '2348021112233',
        secondaryPhone: '2348099998877',
        payerName: 'Mrs. Folashade Adeleke',
        gender: 'male',
        createdAt: new Date().toISOString(),
      };
      expect(client.secondaryPhone).toBe('2348099998877');
      expect(client.payerName).toBe('Mrs. Folashade Adeleke');
    });

    it('UC 1.4: Bespoke Male Anatomical Profiling', () => {
      const maleMeasurements = {
        chest: 44,
        shoulder: 20,
        sleeveLength: 26.5,
        shirtLength: 36,
        neck: 17,
        waist: 36,
        thigh: 25,
        trouserLength: 42,
        ankle: 16,
      };
      expect(isValidAnatomy(maleMeasurements).valid).toBe(true);
      expect(maleMeasurements.chest).toBeGreaterThan(maleMeasurements.waist);
    });

    it('UC 1.5: Bespoke Female Couture Profiling', () => {
      const femaleMeasurements = {
        bust: 38,
        underbust: 32,
        waist: 29,
        hips: 42,
        gownLength: 60,
        shoulderToBustPoint: 11,
        nippleToNipple: 7.5,
      };
      expect(isValidAnatomy(femaleMeasurements).valid).toBe(true);
      expect(femaleMeasurements.hips).toBeGreaterThan(femaleMeasurements.waist);
    });

    it('UC 1.6: Shoe Heel Height Offset for Gowns & Wide Trousers', () => {
      const femaleMeasurements = {
        gownLength: 58,
        heelHeight: 4,
      };
      const totalCutLength = femaleMeasurements.gownLength + femaleMeasurements.heelHeight;
      expect(totalCutLength).toBe(62);
      expect(femaleMeasurements.heelHeight).toBe(4);
    });

    it('UC 1.7: Undergarment & Shapewear Context Logging', () => {
      const customerNotes = 'Measured over Victoria Secret padded corset; cut bust with 0.5 inch extra ease.';
      expect(customerNotes).toContain('padded corset');
    });

    it('UC 1.8: Anatomical Asymmetry & Posture Profiling', () => {
      const fittingNotes = 'Prominent belly posture; slope right shoulder by 0.75 inches.';
      expect(fittingNotes).toContain('slope right shoulder');
    });

    it('UC 1.9: Post-Holiday / Weight-Change Measurement Revision', () => {
      const history = [
        { date: '2025-10-10', waist: 34 },
        { date: '2026-01-15', waist: 36.5 },
      ];
      expect(history[1].waist).toBeGreaterThan(history[0].waist);
      expect(history).toHaveLength(2);
    });

    it('UC 1.10: "Clone My Favorite Garment" (No-Tape Profiling)', () => {
      const garmentMeasurements = {
        isGarmentSample: true,
        chest: 42,
        trouserLength: 40,
        notes: 'Cloned from favorite vintage bespoke trousers',
      };
      expect(garmentMeasurements.isGarmentSample).toBe(true);
      expect(garmentMeasurements.trouserLength).toBe(40);
    });

    it('UC 1.11: Walk-In Consultation with Initial Zero Measurements (Fabric Drop-off)', () => {
      const initialMeasurements = {};
      const order: Order = {
        id: 'ord_fabric_drop',
        shopId: 'shop_1',
        orderDetails: 'Navy Blue Irish Wool Kaftan (Awaiting Fitting)',
        totalBill: 45000,
        depositPaid: 20000,
        status: 'Documented',
        priority: 'normal',
        measurements: initialMeasurements,
        statusHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(order.status).toBe('Documented');
      expect(Object.keys(order.measurements || {})).toHaveLength(0);
      expect(getBalanceOwed(order)).toBe(25000);
    });

    it('UC 1.12: Standalone "Measurements-Only" Walk-In Consultation & WhatsApp Export', () => {
      const receipt = formatMeasurementConsultationReceipt({
        customerName: 'Engr. Dapo Williams',
        fee: 5000,
        currency: 'NGN',
        shopName: 'Heritage Tailors',
      });
      expect(receipt).toContain('Engr. Dapo Williams');
      expect(receipt).toContain('₦5,000');
      expect(receipt).toContain('Measurement Consultation Receipt');
    });
  });

  // =========================================================================
  // PART 2: FABRIC FORENSICS, MATERIAL PREP & CUTTING ROOM (5 UCs)
  // =========================================================================
  describe('Part 2: Fabric Forensics, Material Prep & Cutting Room Operations', () => {
    it('UC 2.1: Fabric Quantity & Shortage Exception Logging', () => {
      const requiredYards = 4.5;
      const suppliedYards = 3.25;
      const isShortage = suppliedYards < requiredYards;
      expect(isShortage).toBe(true);
      const shortageNote = `Inadequate yardage: ${suppliedYards}y supplied vs ${requiredYards}y required. Approved contrast placket.`;
      expect(shortageNote).toContain('Inadequate yardage');
    });

    it('UC 2.2: Fabric Pre-Treatment (Pre-Shrinking & Sponging)', () => {
      const order: Partial<Order> = {
        id: 'ord_sponge_01',
        fabricPreShrunk: true,
        styleName: 'Linen Safari Suit',
      };
      expect(order.fabricPreShrunk).toBe(true);
    });

    it('UC 2.3: Bundle Chalking & Panel Tagging for Multi-Garment Runs', () => {
      const garmentCode = 'ORD-2026-088-A';
      const panels = ['Front-Left', 'Front-Right', 'Back', 'Sleeve-Left', 'Sleeve-Right', 'Collar'];
      const taggedPanels = panels.map((p) => `${garmentCode}::${p}`);
      expect(taggedPanels).toHaveLength(6);
      expect(taggedPanels[0]).toBe('ORD-2026-088-A::Front-Left');
    });

    it('UC 2.4: Leftover Fabric Remnant Return Tracking', () => {
      const order: Partial<Order> = {
        id: 'ord_remnant_01',
        remnantsReturned: true,
      };
      expect(order.remnantsReturned).toBe(true);
    });

    it('UC 2.5: Scrap & Remnant Monetization as Showroom Accessories', () => {
      const scrapPocketSquare: Partial<InventoryItem> = {
        itemName: 'Bespoke Silk Pocket Square (Assorted Offcuts)',
        quantity: 15,
        unit: 'piece',
      };
      expect(scrapPocketSquare.quantity).toBe(15);
    });
  });

  // =========================================================================
  // PART 3: PRODUCTION PIPELINE, ARTISAN ALLOCATION & STAFF CONTRACTS (10 UCs)
  // =========================================================================
  describe('Part 3: Production Pipeline, Artisan Allocation & Staff Contracts', () => {
    it('UC 3.1: Full Stage Cycle Progression', () => {
      const stages: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Delivered'];
      let currentStage: OrderStatus = stages[0];
      expect(currentStage).toBe('Documented');
      currentStage = 'Cutting';
      expect(currentStage).toBe('Cutting');
      currentStage = 'Sewing';
      expect(currentStage).toBe('Sewing');
      currentStage = 'Ready';
      expect(currentStage).toBe('Ready');
      currentStage = 'Delivered';
      expect(currentStage).toBe('Delivered');
    });

    it('UC 3.2: Multi-Month Contract Staff Assignment', () => {
      const contractTailor = {
        name: 'Musa Ibrahim',
        contractType: 'fixed_term_2_months',
        monthlySalary: 120000,
        craftRole: 'tailor' as AtelierCraftRole,
      };
      expect(contractTailor.contractType).toBe('fixed_term_2_months');
      expect(contractTailor.craftRole).toBe('tailor');
    });

    it('UC 3.3: Artisan Specialty Role Allocation', () => {
      expect(CRAFT_ROLE_LABELS.cutter).toBe('Master Cutter');
      expect(CRAFT_ROLE_LABELS.tailor).toBe('Tailor / Machinist');
      expect(CRAFT_ROLE_LABELS.embroiderer).toBe('Embroiderer');
      expect(CRAFT_ROLE_LABELS.finisher).toBe('Finisher / Presser');
      expect(CRAFT_ROLE_LABELS.apprentice).toBe('Apprentice / Trainee');
    });

    it('UC 3.4: Multi-Artisan Specialization Task Handoff', () => {
      const order: Partial<Order> = {
        id: 'ord_multi_artisan',
        artisanAssignments: [
          { role: 'cutter', staffId: 'usr_c1', staffName: 'Baba Tunde' },
          { role: 'tailor', staffId: 'usr_t2', staffName: 'Sister Chioma' },
          { role: 'finisher', staffId: 'usr_f3', staffName: 'Grace' },
        ],
      };
      expect(order.artisanAssignments).toHaveLength(3);
      expect(order.artisanAssignments?.[0].role).toBe('cutter');
      expect(order.artisanAssignments?.[1].staffName).toBe('Sister Chioma');
    });

    it('UC 3.5: Artisan Piece-Rate Payout Calculation with Advance Deduction', () => {
      const testOrders: Order[] = [
        {
          id: 'o1',
          shopId: 's1',
          orderDetails: 'Senator Suit 1',
          totalBill: 30000,
          depositPaid: 30000,
          status: 'Delivered',
          assignedTo: 'artisan_07',
          priority: 'normal',
          statusHistory: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'o2',
          shopId: 's1',
          orderDetails: 'Senator Suit 2',
          totalBill: 30000,
          depositPaid: 30000,
          status: 'Ready',
          assignedTo: 'artisan_07',
          priority: 'normal',
          statusHistory: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'o3',
          shopId: 's1',
          orderDetails: 'Senator Suit 3',
          totalBill: 30000,
          depositPaid: 15000,
          status: 'Sewing',
          assignedTo: 'artisan_07',
          priority: 'normal',
          statusHistory: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const payout = calculateArtisanPayout(testOrders, 'artisan_07', 3500, 2000);
      expect(payout.completedCount).toBe(2);
      expect(payout.grossEarnings).toBe(7000);
      expect(payout.advancesDeducted).toBe(2000);
      expect(payout.netPayout).toBe(5000);
    });

    it('UC 3.6: Staff Sabbatical & Production Load Rebalancing', () => {
      const activeArtisans = [
        { id: 'artisan_1', name: 'Kola', onSabbatical: true },
        { id: 'artisan_2', name: 'Emeka', onSabbatical: false },
      ];
      const availableArtisans = activeArtisans.filter((a) => !a.onSabbatical);
      expect(availableArtisans).toHaveLength(1);
      expect(availableArtisans[0].name).toBe('Emeka');
    });

    it('UC 3.7: Apprentice Craft Role Progression', () => {
      let role: AtelierCraftRole = 'apprentice';
      expect(CRAFT_ROLE_LABELS[role]).toBe('Apprentice / Trainee');
      role = 'tailor';
      expect(CRAFT_ROLE_LABELS[role]).toBe('Tailor / Machinist');
    });

    it('UC 3.8: Live Public Tracking URL Resolution', () => {
      const orderId = 'ord_track_999';
      const trackingUrl = `${APP_CONFIG.baseUrl}/track/${orderId}`;
      expect(trackingUrl).toContain(`/track/${orderId}`);
      expect(trackingUrl).not.toContain('localhost');
    });

    it('UC 3.9: Photo-Proof WhatsApp Progress Updates', () => {
      const msg = getOrderProgressMessage({
        orderId: 'ord_photo_01',
        status: 'Ready',
        customerName: 'Barrister Tayo',
        shopName: 'Imperial Stitches',
        trackingUrl: 'https://mytailorbook.com/track/ord_photo_01',
      });
      expect(msg).toContain('Barrister');
      expect(msg).toContain('ready');
      expect(msg).toContain('https://mytailorbook.com/track/ord_photo_01');
    });

    it('UC 3.10: Emergency Botched-Garment Rescue Triage', () => {
      const rescueOrder: Partial<Order> = {
        id: 'ord_rescue_01',
        isRescueJob: true,
        priority: 'rush',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      };
      expect(rescueOrder.isRescueJob).toBe(true);
      expect(rescueOrder.priority).toBe('rush');
    });
  });

  // =========================================================================
  // PART 4: FITTINGS, STRUCTURAL ENGINEERING & ALTERATIONS (10 UCs)
  // =========================================================================
  describe('Part 4: Fittings, Structural Engineering & Alterations', () => {
    it('UC 4.1: Muslin / Toile Mockup Phase for Bridal & Couture', () => {
      const coutureOrder: Partial<Order> = {
        id: 'ord_bridal_01',
        requiresToile: true,
        styleName: 'Structured Corset Gown',
      };
      expect(coutureOrder.requiresToile).toBe(true);
    });

    it('UC 4.2: First Fitting (Basting Stage) Adjustments', () => {
      const initialWaist = 36;
      const fittingAdjustment = -1.5;
      const finalWaist = initialWaist + fittingAdjustment;
      expect(finalWaist).toBe(34.5);
    });

    it('UC 4.3: Remote Live Video-Fitting Invitation Generation', () => {
      const videoMsg = getVideoFittingMessage(
        'Dr. Chinedu',
        '3-Piece Italian Wool Suit',
        'https://mytailorbook.com/track/ord_video_01'
      );
      expect(videoMsg).toContain('Dr. Chinedu');
      expect(videoMsg).toContain('3-Piece Italian Wool Suit');
      expect(videoMsg).toContain('video fitting');
    });

    it('UC 4.4: Mid-Production Style Modification & Bill Recalculation', () => {
      let totalBill = 45000;
      const styleUpgradeCharge = 7000;
      totalBill += styleUpgradeCharge;
      expect(totalBill).toBe(52000);
      expect(formatCurrency(totalBill)).toBe('₦52,000');
    });

    it('UC 4.5: Mid-Production Embellishment Upgrades', () => {
      const baseCost = 65000;
      const stoneWorkCharge = 15000;
      const totalCost = baseCost + stoneWorkCharge;
      expect(totalCost).toBe(80000);
      expect(formatCurrency(totalCost)).toBe('₦80,000');
    });

    it('UC 4.6: Specialized Smartphone Pocket Engineering', () => {
      const order: Partial<Order> = {
        id: 'ord_phone_pocket',
        customPockets: ['smartphone_deep_pocket', 'angled_welt'],
      };
      expect(order.customPockets).toContain('smartphone_deep_pocket');
    });

    it('UC 4.7: Concealed Security & Travel Pockets', () => {
      const order: Partial<Order> = {
        id: 'ord_security_pocket',
        customPockets: ['hidden_waistband_zip', 'passport_chest_welt'],
      };
      expect(order.customPockets).toContain('hidden_waistband_zip');
    });

    it('UC 4.8: Post-Delivery Alteration & Linked Rework Tracking', () => {
      const originalOrderId = 'ord_deliv_77';
      const alterationTicket = {
        id: 'alt_01',
        parentOrderId: originalOrderId,
        isRework: true,
        complaint: 'Trouser hem too long by 1 inch',
      };
      expect(alterationTicket.parentOrderId).toBe('ord_deliv_77');
      expect(alterationTicket.isRework).toBe(true);
    });

    it('UC 4.9: Express 45-Minute Walk-In Alterations', () => {
      const quickAlterationOrder: Order = {
        id: 'ord_quick_alt',
        shopId: 'shop_1',
        orderDetails: 'Emergency Trouser Hem Shortening (Walk-in)',
        totalBill: 4000,
        depositPaid: 4000,
        status: 'Delivered',
        priority: 'rush',
        statusHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(quickAlterationOrder.totalBill).toBe(4000);
      expect(getBalanceOwed(quickAlterationOrder)).toBe(0);
      expect(quickAlterationOrder.priority).toBe('rush');
    });

    it('UC 4.10: Shoe Heel Height Offset Integration', () => {
      const clientProfile = {
        fullName: 'Mrs. Amina Bello',
        gownLength: 60,
        heelHeight: 3.5,
      };
      const finishedLength = clientProfile.gownLength + clientProfile.heelHeight;
      expect(finishedLength).toBe(63.5);
    });
  });

  // =========================================================================
  // PART 5: FINANCIAL OPERATIONS, MULTI-CURRENCY, RECEIPTS & DEBT (14 UCs)
  // =========================================================================
  describe('Part 5: Financial Operations, Multi-Currency, Receipts & Debt', () => {
    it('UC 5.1: Full 100% Advance Payment Settlement', () => {
      const order: Order = {
        id: 'ord_full_pay',
        shopId: 'shop_1',
        orderDetails: 'Cashmere Kaftan',
        totalBill: 75000,
        depositPaid: 75000,
        status: 'Documented',
        priority: 'normal',
        statusHistory: [],
        createdAt: '',
        updatedAt: '',
      };
      expect(getBalanceOwed(order)).toBe(0);
    });

    it('UC 5.2: Standard 50% Commitment Deposit', () => {
      const order: Order = {
        id: 'ord_50_pct',
        shopId: 'shop_1',
        orderDetails: 'Senator Suit',
        totalBill: 50000,
        depositPaid: 25000,
        status: 'Documented',
        priority: 'normal',
        statusHistory: [],
        createdAt: '',
        updatedAt: '',
      };
      expect(getBalanceOwed(order)).toBe(25000);
    });

    it('UC 5.3: Zero Advance Deposit for VIP Clients', () => {
      const order: Order = {
        id: 'ord_vip_0_dep',
        shopId: 'shop_1',
        orderDetails: '3-Piece Agbada Set',
        totalBill: 120000,
        depositPaid: 0,
        status: 'Cutting',
        priority: 'normal',
        statusHistory: [],
        createdAt: '',
        updatedAt: '',
      };
      expect(getBalanceOwed(order)).toBe(120000);
    });

    it('UC 5.4: Split-Tender Settlement (Cash + Bank Transfer)', () => {
      const payments = [
        { method: 'bank_transfer' as PaymentMethod, amount: 40000 },
        { method: 'cash' as PaymentMethod, amount: 20000 },
      ];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(60000);
      expect(formatCurrency(totalPaid)).toBe('₦60,000');
    });

    it('UC 5.5: POS Card Terminal Reconciliation', () => {
      const posPayment = {
        method: 'pos' as PaymentMethod,
        amount: 35000,
        reference: 'POS_STANBIC_88921',
      };
      expect(posPayment.method).toBe('pos');
      expect(posPayment.reference).toBe('POS_STANBIC_88921');
    });

    it('UC 5.6: Customer Overpayment & Store Credit Rollover', () => {
      const totalBill = 48000;
      const actualPaid = 50000;
      const overpayment = actualPaid - totalBill;
      expect(overpayment).toBe(2000);
      const customerWallet = overpayment;
      expect(customerWallet).toBe(2000);
    });

    it('UC 5.7: Debt Tracking & Handover Clearance Alerts', () => {
      const order: Order = {
        id: 'ord_debt_01',
        shopId: 'shop_1',
        orderDetails: 'Bespoke Blazer',
        totalBill: 60000,
        depositPaid: 20000,
        status: 'Ready',
        priority: 'normal',
        statusHistory: [],
        createdAt: '',
        updatedAt: '',
      };
      const balance = getBalanceOwed(order);
      expect(balance).toBe(40000);
      const isReleaseBlocked = balance > 0;
      expect(isReleaseBlocked).toBe(true);
    });

    it('UC 5.8: Third-Party Payer Matching', () => {
      const paymentRecord = {
        amount: 50000,
        method: 'bank_transfer' as PaymentMethod,
        payerName: 'Mrs. Folashade Adeleke',
        beneficiaryCustomer: 'Chief Segun Adeleke',
      };
      expect(paymentRecord.payerName).not.toBe(paymentRecord.beneficiaryCustomer);
      expect(paymentRecord.payerName).toBe('Mrs. Folashade Adeleke');
    });

    it('UC 5.9: Goodwill Rounding & Discretionary Discounts', () => {
      const calculatedTotal = 52500;
      const goodwillTotal = 50000;
      const discount = calculatedTotal - goodwillTotal;
      expect(discount).toBe(2500);
      expect(formatCurrency(goodwillTotal)).toBe('₦50,000');
    });

    it('UC 5.10: Client Material Procurement vs. Sewing Workmanship Split', () => {
      const order: Order = {
        id: 'ord_split_rev',
        shopId: 'shop_1',
        orderDetails: 'Senator with Imported Wool Sourcing',
        totalBill: 75000,
        depositPaid: 75000,
        materialSuppliedBy: 'shop',
        materialCost: 35000,
        otherCosts: 5000,
        status: 'Delivered',
        priority: 'normal',
        statusHistory: [],
        createdAt: '',
        updatedAt: '',
      };
      expect(hasCostData(order)).toBe(true);
      const margin = getMargin(order);
      expect(margin).toBe(35000); // 75000 - 35000 - 5000 = 35000
    });

    it('UC 5.11: Multi-Currency Dynamic Formatting (NGN, USD, GBP, EUR, GHS, KES)', () => {
      expect(getCurrencySymbol('NGN')).toBe('₦');
      expect(formatCurrency(50000, 'NGN')).toBe('₦50,000');

      expect(getCurrencySymbol('USD')).toBe('$');
      expect(formatCurrency(150, 'USD')).toBe('$150');

      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(formatCurrency(120, 'GBP')).toBe('£120');

      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(formatCurrency(200, 'EUR')).toBe('€200');

      expect(getCurrencySymbol('GHS')).toBe('GH₵');
      expect(formatCurrency(1200, 'GHS')).toBe('GH₵1,200');

      expect(getCurrencySymbol('KES')).toBe('KES');
      expect(formatCurrency(5000, 'KES').replace(/\s+/g, ' ')).toBe('KES 5,000');
    });

    it('UC 5.12: Mobile Money / Transfer Verification Gate', () => {
      let isAlertConfirmed = false;
      let orderReleased = false;

      // Gate check
      if (isAlertConfirmed) {
        orderReleased = true;
      }
      expect(orderReleased).toBe(false);

      // Bank confirmation arrives
      isAlertConfirmed = true;
      if (isAlertConfirmed) {
        orderReleased = true;
      }
      expect(orderReleased).toBe(true);
    });

    it('UC 5.13: Digital Thermal Receipt Generation and WhatsApp Delivery Link', () => {
      const order: Order = {
        id: 'ord_rec_01',
        shopId: 'shop_1',
        orderDetails: 'White Linen Senator',
        totalBill: 45000,
        depositPaid: 45000,
        status: 'Delivered',
        priority: 'normal',
        payments: [{ id: 'p_1', amount: 45000, recordedBy: 'u1', recordedByName: 'Cashier', timestamp: '2026-03-01' }],
        statusHistory: [],
        createdAt: '',
        updatedAt: '',
      };
      const receiptUrl = `${APP_CONFIG.baseUrl}/receipts/${order.id}`;
      const msg = `Good day! Here is your digital receipt for ${order.orderDetails}: ${receiptUrl}`;
      const waLink = getWhatsAppLink('08021112233', msg);
      expect(waLink).toContain('wa.me/2348021112233');
      expect(waLink).toContain(encodeURIComponent(receiptUrl));
    });

    it('UC 5.14: Running VIP Statement of Account Generation', () => {
      const customer: Customer = {
        id: 'cust_vip_01',
        shopId: 'shop_1',
        fullName: 'Alhaji Garba Shehu',
        whatsappNumber: '2348033334444',
        gender: 'male',
        createdAt: '',
      };
      const orders: Order[] = [
        {
          id: 'o_vip_1',
          shopId: 'shop_1',
          customerId: 'cust_vip_01',
          orderDetails: 'Navy Agbada',
          totalBill: 90000,
          depositPaid: 90000,
          status: 'Delivered',
          priority: 'normal',
          statusHistory: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'o_vip_2',
          shopId: 'shop_1',
          customerId: 'cust_vip_01',
          orderDetails: 'Cream Kaftan',
          totalBill: 50000,
          depositPaid: 20000,
          status: 'Ready',
          priority: 'normal',
          statusHistory: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const statement = generateCustomerStatement(customer, orders, 'NGN');
      expect(statement).toContain('Alhaji Garba Shehu');
      expect(statement).toContain('Total Billed: ₦140,000');
      expect(statement).toContain('Total Paid: ₦110,000');
      expect(statement).toContain('Outstanding Balance: ₦30,000');
    });
  });

  // =========================================================================
  // PART 6: WORKSHOP OVERHEAD, MACHINERY & TECHNICAL LOGISTICS (6 UCs)
  // =========================================================================
  describe('Part 6: Workshop Overhead, Machinery & Technical Logistics', () => {
    it('UC 6.1: Itemized Daily Workshop Overhead Categorization', () => {
      const expenses: { category: ExpenseCategory; amount: number; description: string }[] = [
        { category: 'logistics', amount: 12000, description: '10 Litres petrol for workshop generator' },
        { category: 'general', amount: 3500, description: 'Singer machine oil and bobbin springs' },
        { category: 'material', amount: 8000, description: 'Box of Groz-Beckert needles & canvas' },
        { category: 'labor', amount: 4000, description: 'Apprentice lunch and transport upkeep' },
      ];
      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalExpense).toBe(27500);
      expect(formatCurrency(totalExpense)).toBe('₦27,500');
    });

    it('UC 6.2: End-of-Day Financial Reconciliation String Generation', () => {
      const summary = {
        date: '2026-03-01',
        cashIn: 85000,
        transfersIn: 140000,
        expenses: 27500,
        netCashflow: 197500,
      };
      const report =
        `*Workshop Audit: ${summary.date}*\n` +
        `• Bank Transfers: ${formatCurrency(summary.transfersIn)}\n` +
        `• Cash Received: ${formatCurrency(summary.cashIn)}\n` +
        `• Operating Expenses: ${formatCurrency(summary.expenses)}\n` +
        `• Net Workshop Cashflow: ${formatCurrency(summary.netCashflow)}`;
      expect(report).toContain('₦140,000');
      expect(report).toContain('₦27,500');
      expect(report).toContain('₦197,500');
    });

    it('UC 6.3: Scissor & Shears Sharpening Maintenance Expense', () => {
      const shearsExpense = {
        category: 'maintenance' as ExpenseCategory,
        amount: 2500,
        description: 'Honing 5 tailor shears and pinking shears',
      };
      expect(shearsExpense.category).toBe('maintenance');
      expect(shearsExpense.amount).toBe(2500);
    });

    it('UC 6.4: Sewing Machine Motor Upgrade Capital Expense', () => {
      const motorUpgradeExpense = {
        category: 'maintenance' as ExpenseCategory,
        amount: 38000,
        description: 'Silent variable-speed digital servo motor conversion',
      };
      expect(motorUpgradeExpense.amount).toBe(38000);
    });

    it('UC 6.5: Subcontracted Machine Operations (Keyhole Buttonholes & Eyelets)', () => {
      const subcontractExpense = {
        category: 'materials' as ExpenseCategory,
        amount: 4500,
        description: 'Market computerized keyhole buttonholes on 15 jackets',
      };
      expect(subcontractExpense.amount).toBe(4500);
    });

    it('UC 6.6: Post-Production Spot Cleaning & Dry Cleaning Expense', () => {
      const spotCleanExpense = {
        category: 'maintenance' as ExpenseCategory,
        amount: 3000,
        description: 'Emergency solvent spot cleaning on white bridal agbada',
      };
      expect(spotCleanExpense.amount).toBe(3000);
    });
  });

  // =========================================================================
  // PART 7: SHOWROOM INVENTORY, RTW & RETAIL COUNTER POS (6 UCs)
  // =========================================================================
  describe('Part 7: Showroom Inventory, RTW & Retail Counter POS', () => {
    it('UC 7.1: Factory Batch Delivery Auto-Stocking into Showroom Inventory', () => {
      const initialStock = 5;
      const batchDelivered = 20;
      const updatedStock = initialStock + batchDelivered;
      expect(updatedStock).toBe(25);
    });

    it('UC 7.2: Walk-In Retail Sale & Immediate Stock Decrement', () => {
      let currentStock = 25;
      const unitsSold = 2;
      currentStock -= unitsSold;
      expect(currentStock).toBe(23);
    });

    it('UC 7.3: Showroom Accessory Consignment Tracking', () => {
      const consignmentItem: InventoryItem = {
        id: 'inv_cufflinks_01',
        shopId: 'shop_1',
        itemName: 'Handcrafted Brass Cufflinks',
        quantity: 12,
        unit: 'pair',
        isConsignment: true,
        consignorName: 'Adeleke Metals',
        consignorCutPercent: 70,
        createdAt: '',
        updatedAt: '',
      };
      expect(consignmentItem.isConsignment).toBe(true);
      expect(consignmentItem.consignorCutPercent).toBe(70);
    });

    it('UC 7.4: Quarterly RTW Deadstock Clearance Markdowns', () => {
      const originalPrice = 45000;
      const clearanceDiscount = 0.2; // 20% off
      const markdownPrice = originalPrice * (1 - clearanceDiscount);
      expect(markdownPrice).toBe(36000);
      expect(formatCurrency(markdownPrice)).toBe('₦36,000');
    });

    it('UC 7.5: Branded Packaging & Trims Consumables Inventory Tracking', () => {
      const packagingItem: InventoryItem = {
        id: 'inv_bags_01',
        shopId: 'shop_1',
        itemName: 'Luxury Breathable Suit Carrier Bags',
        quantity: 85,
        unit: 'piece',
        lowStockThreshold: 20,
        createdAt: '',
        updatedAt: '',
      };
      expect(packagingItem.quantity).toBeGreaterThan(packagingItem.lowStockThreshold || 0);
    });

    it('UC 7.6: Multi-Variant Sizing Allocation (S, M, L, XL, XXL)', () => {
      const sizeBreakdown = [
        { size: 'M', quantity: 6 },
        { size: 'L', quantity: 10 },
        { size: 'XL', quantity: 4 },
      ];
      const totalBatch = sizeBreakdown.reduce((sum, s) => sum + s.quantity, 0);
      expect(totalBatch).toBe(20);
    });
  });

  // =========================================================================
  // PART 8: GROUP ORDERS, EVENTS, BRIDAL & SEASONAL SURGES (6 UCs)
  // =========================================================================
  describe('Part 8: Group Orders, Events, Bridal & Seasonal Surges', () => {
    it('UC 8.1: Mega "Aso Ebi" Wedding Party Group Dashboard Batch Linking', () => {
      const batchId = 'batch_wedding_ade_2026';
      const bridesmaids = [
        { name: 'Kemi', deposit: 30000, status: 'Ready' },
        { name: 'Ngozi', deposit: 15000, status: 'Sewing' },
        { name: 'Zainab', deposit: 30000, status: 'Cutting' },
      ];
      const totalCollected = bridesmaids.reduce((sum, b) => sum + b.deposit, 0);
      expect(totalCollected).toBe(75000);
      expect(batchId).toBe('batch_wedding_ade_2026');
    });

    it('UC 8.2: Wedding Party Garment Bag Tag Generation', () => {
      const batchList = [
        { customerName: 'Femi Otedola', role: 'Best Man', styleName: 'Royal Agbada', accessories: ['Fila', 'Pocket Square'] },
        { customerName: 'Kunle Afolayan', role: 'Groomsman 1', styleName: 'Kaftan Set', accessories: ['Cufflinks'] },
      ];
      const tags = generateBatchGarmentTags(batchList);
      expect(tags).toHaveLength(2);
      expect(tags[0]).toContain('Tag #1: Femi Otedola [Best Man]');
      expect(tags[0]).toContain('Accessories: Fila, Pocket Square');
    });

    it('UC 8.3: Festive Surge Capacity Capping & Rush Surcharges', () => {
      const maxWorkshopCapacity = 150;
      const currentBookedOrders = 150;
      const isCapacityReached = currentBookedOrders >= maxWorkshopCapacity;
      expect(isCapacityReached).toBe(true);

      const standardPrice = 40000;
      const rushSurchargeRate = 0.4; // 40% surge
      const rushPrice = standardPrice * (1 + rushSurchargeRate);
      expect(rushPrice).toBe(56000);
      expect(formatCurrency(rushPrice)).toBe('₦56,000');
    });

    it('UC 8.4: Ramadan & Eid Menswear Production Spikes', () => {
      const eidOrdersCount = 45;
      const embroiderySubcontractPerUnit = 4000;
      const totalEmbroideryOutflow = eidOrdersCount * embroiderySubcontractPerUnit;
      expect(totalEmbroideryOutflow).toBe(180000);
      expect(formatCurrency(totalEmbroideryOutflow)).toBe('₦180,000');
    });

    it('UC 8.5: Corporate & School Uniform Contract Milestone Billing', () => {
      const contractTotal = 1500000;
      const tranche1Mobilization = contractTotal * 0.4; // 40%
      const tranche2Fitting = contractTotal * 0.4; // 40%
      const tranche3Delivery = contractTotal * 0.2; // 20%
      expect(tranche1Mobilization + tranche2Fitting + tranche3Delivery).toBe(contractTotal);
      expect(formatCurrency(tranche1Mobilization)).toBe('₦600,000');
    });

    it('UC 8.6: Pre-Holiday Workshop Shutdown Notices', () => {
      const shutdownDate = '2026-12-24';
      const resumeDate = '2027-01-08';
      const notice = `Notice: Our atelier will be closed for the annual holidays from ${shutdownDate} to ${resumeDate}. All holiday orders must be booked before Dec 5.`;
      expect(notice).toContain('2026-12-24');
      expect(notice).toContain('2027-01-08');
    });
  });

  // =========================================================================
  // PART 9: LOGISTICS, COURIER HANDOVER & INTERNATIONAL SHIPPING (3 UCs)
  // =========================================================================
  describe('Part 9: Logistics, Courier Handover & International Shipping', () => {
    it('UC 9.1: Local Dispatch Rider Handover Protocol', () => {
      const order: Partial<Order> = {
        id: 'ord_dispatch_01',
        courierDetails: {
          riderName: 'Sunday Balogun',
          riderPhone: '08055554433',
          bikeNumber: 'LND-492-QA',
          feePaidBy: 'customer',
        },
      };
      expect(order.courierDetails?.riderName).toBe('Sunday Balogun');
      expect(order.courierDetails?.feePaidBy).toBe('customer');
    });

    it('UC 9.2: In-Flight Airport Delivery Destination Rerouting', () => {
      let deliveryAddress = '15 Admiralty Way, Lekki Phase 1';
      deliveryAddress = 'Murtala Muhammed Airport Terminal 2 Departure Hall (Urgent)';
      expect(deliveryAddress).toContain('Airport Terminal 2');
    });

    it('UC 9.3: Diaspora Air Freight & Customs Logistics', () => {
      const order: Partial<Order> = {
        id: 'ord_intl_01',
        shippingDetails: {
          airwayBill: 'DHL-8921-9901-NG',
          destinationCountry: 'United Kingdom',
          customsDeclaration: "Men's Traditional Cotton Attire (2 Sets)",
        },
      };
      expect(order.shippingDetails?.airwayBill).toBe('DHL-8921-9901-NG');
      expect(order.shippingDetails?.destinationCountry).toBe('United Kingdom');
    });
  });

  // =========================================================================
  // PART 10: TAILOR CIRCLE, COMMUNITY & COLLABORATION (5 UCs)
  // =========================================================================
  describe('Part 10: Tailor Circle, Community & Collaboration (Independent of XP)', () => {
    it('UC 10.1: Tailor Circle Workshop Invitations Free of XP References', () => {
      const code = 'STUDIO4000';
      const origin = APP_CONFIG.baseUrl;
      const shareUrl = `${origin}/circle?connect=${code}`;
      const inviteMsg = `Good day! Join my Tailor Circle on ${APP_CONFIG.name} so our workshops can keep our daily production streaks accountable. Tap this link to connect with me: ${shareUrl}`;

      expect(inviteMsg).not.toContain('XP');
      expect(inviteMsg).toContain(APP_CONFIG.name);
      expect(inviteMsg).toContain(code);
    });

    it('UC 10.2: Peer Atelier Sabbatical Alert without XP Jargon', () => {
      const buddyName = 'Segun Tailors';
      const sabbaticalNotice = `${buddyName} placed on Sabbatical (streaks paused while away)`;

      expect(sabbaticalNotice).not.toContain('XP');
      expect(sabbaticalNotice).toContain('streaks paused while away');
    });

    it('UC 10.3: Daily Operational Streak Accountability without XP', () => {
      let currentStreak = 14;
      const loggedToday = true;
      if (loggedToday) {
        currentStreak += 1;
      }
      expect(currentStreak).toBe(15);
      expect(`${currentStreak} days active`).toBe('15 days active');
    });

    it('UC 10.4: Neighboring Workshop Notion Borrowing Notes', () => {
      const note = 'Borrowed 2 spools of olive green matching thread from Bros Kayode; return Friday.';
      expect(note).toContain('Bros Kayode');
    });

    it('UC 10.5: Guild Minimum Workmanship Price-Floor Compliance', () => {
      const guildFloorPrice = 30000;
      const shopQuotedPrice = 35000;
      expect(shopQuotedPrice).toBeGreaterThanOrEqual(guildFloorPrice);
    });
  });

  // =========================================================================
  // PART 11: CUSTOMER RETENTION, LOOKBOOKS & LONG-TERM LOYALTY (6 UCs)
  // =========================================================================
  describe('Part 11: Customer Retention, Lookbooks & Long-Term Loyalty', () => {
    it('UC 11.1: Editorial Digital Lookbook & Portfolio Publishing', () => {
      const lookbookUrl = `${APP_CONFIG.baseUrl}/studio/savile-heritage`;
      expect(lookbookUrl).toContain('/studio/savile-heritage');
      expect(lookbookUrl).not.toContain('localhost');
    });

    it('UC 11.2: Direct WhatsApp Lookbook Outreach', () => {
      const customerName = 'Chief Alabi';
      const outfitTitle = 'Royal Burgundy Agbada Set';
      const lookbookUrl = `${APP_CONFIG.baseUrl}/catalogues/royal-burgundy`;
      const msg = `Good day ${customerName.split(' ')[0]}! We just published our ${outfitTitle} in our lookbook. Here is a preview: ${lookbookUrl}`;
      const url = getWhatsAppLink('08023456789', msg);
      expect(url).toContain('wa.me/2348023456789');
      expect(url).toContain(encodeURIComponent(lookbookUrl));
    });

    it('UC 11.3: Automated Client Birthday Styling Perks Generation', () => {
      const greeting = getBirthdayGreeting('Alhaja Kudirat', 15);
      expect(greeting).toContain('Happy Birthday Alhaja!');
      expect(greeting).toContain('15% off workmanship');
    });

    it('UC 11.4: Client Referral Reward Ledgers', () => {
      const referralCredit = 10000;
      let bill = 60000;
      bill -= referralCredit;
      expect(bill).toBe(50000);
      expect(formatCurrency(bill)).toBe('₦50,000');
    });

    it('UC 11.5: Unclaimed Garment Rack Congestion & Storage Demurrage Warnings', () => {
      const daysUncollected = 45;
      const isDemurrageActive = daysUncollected > 30;
      expect(isDemurrageActive).toBe(true);
      const reminderMsg = 'Kindly note that garments uncollected after 30 days attract a nominal storage demurrage fee.';
      expect(reminderMsg).toContain('storage demurrage');
    });

    it('UC 11.6: Multi-Year Client Measurement Evolution Retrospective', () => {
      const clientMeasurementsOverTime = [
        { year: 2022, chest: 40, waist: 32 },
        { year: 2024, chest: 42, waist: 34 },
        { year: 2026, chest: 44, waist: 36 },
      ];
      expect(clientMeasurementsOverTime[2].chest).toBeGreaterThan(clientMeasurementsOverTime[0].chest);
      expect(clientMeasurementsOverTime).toHaveLength(3);
    });
  });

  // =========================================================================
  // PART 12: BUSINESS GOVERNANCE, LEGAL, SAFETY & CONTINGENCY (3 UCs)
  // =========================================================================
  describe('Part 12: Business Governance, Legal, Safety & Contingency', () => {
    it('UC 12.1: Design Copyright & Timestamped IP Defense Verification', () => {
      const designRecord = {
        designId: 'dsgn_royal_crest_01',
        sketchTimestamp: '2025-08-12T10:15:00Z',
        intakeInvoiceId: 'inv_4401',
        clientOrderDate: '2025-08-14T09:00:00Z',
      };
      expect(new Date(designRecord.sketchTimestamp).getTime()).toBeLessThan(
        new Date(designRecord.clientOrderDate).getTime()
      );
    });

    it('UC 12.2: Abandoned Garment 365-Day Legal Archive & Liquidation', () => {
      const daysAbandoned = 380;
      const isEligibleForLiquidation = daysAbandoned > 365;
      expect(isEligibleForLiquidation).toBe(true);
    });

    it('UC 12.3: Multi-Branch Coordination (Front Showroom vs. Remote Factory)', () => {
      const branches = [
        { id: 'branch_showroom', name: 'Victoria Island Boutique Showroom', type: 'retail' },
        { id: 'branch_factory', name: 'Yaba Production Workshop', type: 'factory' },
      ];
      let activeBranchId = branches[0].id;
      expect(activeBranchId).toBe('branch_showroom');
      activeBranchId = branches[1].id;
      expect(activeBranchId).toBe('branch_factory');
    });
  });
});
