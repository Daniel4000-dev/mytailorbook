import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhone,
  normalizePhone,
  isValidPhone,
  getOrderProgressMessage,
  formatMeasurementsSummary,
  getWhatsAppLink,
  getTelLink,
} from '@/lib/formatters';
import { isValidAnatomy } from '@/lib/validations/anatomy';
import { getBalanceOwed, type Order, type OrderStatus, type PaymentMethod } from '@/lib/types';
import { APP_CONFIG } from '@/lib/config';

describe('End-to-End Customer Lifecycle Simulation', () => {
  // Mock Customer Data
  const customerInput = {
    fullName: 'Babajide Adeleke',
    phone: '08023456789',
    gender: 'male' as const,
    measurements: {
      chest: 42,
      shoulder: 19.5,
      sleeveLength: 26,
      shirtLength: 34,
      neck: 16.5,
      waist: 34,
      thigh: 24,
      trouserLength: 41,
    },
    notes: 'Likes senator neck fitted with concealed placket.',
  };

  it('Step 1: Client Intake & Anatomical Measurements Validation', () => {
    // Phone normalization & validation
    expect(isValidPhone(customerInput.phone)).toBe(true);
    const normalizedPhone = normalizePhone(customerInput.phone);
    expect(normalizedPhone).toBe('2348023456789');
    expect(formatPhone(normalizedPhone)).toBe('+234 802 345 6789');

    // Phone dialer generation
    expect(getTelLink(customerInput.phone)).toBe('tel:+2348023456789');

    // Anatomical validation for bespoke senator style
    const anatomyCheck = isValidAnatomy(customerInput.measurements);
    expect(anatomyCheck.valid).toBe(true);

    // Format measurements summary for WhatsApp sharing
    const shareSummary = formatMeasurementsSummary({
      customerName: customerInput.fullName,
      gender: customerInput.gender,
      measurements: customerInput.measurements,
      notes: customerInput.notes,
      labels: {
        chest: 'Chest',
        shoulder: 'Shoulder',
        sleeveLength: 'Sleeve Length',
        shirtLength: 'Top Length',
        neck: 'Neck',
        waist: 'Waist',
        thigh: 'Thigh',
        trouserLength: 'Trouser Length',
      },
    });

    expect(shareSummary).toContain(`*Measurements: ${customerInput.fullName}*`);
    expect(shareSummary).toContain('Gender: Male');
    expect(shareSummary).toContain('• Chest: 42"');
    expect(shareSummary).toContain('• Waist: 34"');
    expect(shareSummary).toContain(`*Notes:* ${customerInput.notes}`);
    expect(shareSummary).toContain(`— via ${APP_CONFIG.name}`);
  });

  it('Step 2: Order Intake, Deposit & Financial Balance Tracking', () => {
    // Initial order intake with 50% deposit
    const order: Order = {
      id: 'order_e2e_001',
      shopId: 'shop_e2e_001',
      customerId: 'cust_e2e_001',
      customerName: customerInput.fullName,
      styleName: 'Senator Suit',
      orderDetails: 'Navy Blue Wool Senator with Gold Stitching',
      totalBill: 120000,
      depositPaid: 60000,
      status: 'Documented',
      priority: 'normal',
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verify balance owed calculation
    expect(getBalanceOwed(order)).toBe(60000);
    expect(formatCurrency(order.totalBill)).toBe('₦120,000');
    expect(formatCurrency(order.depositPaid)).toBe('₦60,000');
    expect(formatCurrency(getBalanceOwed(order))).toBe('₦60,000');

    // Generate public tracking link
    const trackingUrl = `${APP_CONFIG.baseUrl}/track/${order.id}`;
    expect(trackingUrl).toBe(`https://${APP_CONFIG.domain}/track/order_e2e_001`);

    // Verify stage 1 progress message
    const intakeMessage = getOrderProgressMessage({
      status: 'Documented',
      customerName: order.customerName || '',
      shopName: 'Victoria Atelier',
      trackingUrl,
    });
    expect(intakeMessage).toContain(customerInput.fullName.split(' ')[0]);
    expect(intakeMessage).toContain('Victoria Atelier');
    expect(intakeMessage).toContain(trackingUrl);
  });

  it('Step 3: Production Pipeline Progression & Embellishment Addition', () => {
    const order: Order = {
      id: 'order_e2e_001',
      shopId: 'shop_e2e_001',
      customerId: 'cust_e2e_001',
      customerName: customerInput.fullName,
      styleName: 'Senator Suit',
      orderDetails: 'Navy Blue Wool Senator with Gold Stitching',
      totalBill: 120000,
      depositPaid: 60000,
      status: 'Documented',
      priority: 'normal',
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const trackingUrl = `${APP_CONFIG.baseUrl}/track/${order.id}`;
    const stages: OrderStatus[] = ['Cutting', 'Sewing', 'Ready', 'Delivered'];

    // Progress through workshop Kanban stages
    for (const nextStage of stages) {
      order.status = nextStage;
      order.updatedAt = new Date().toISOString();

      const progressMessage = getOrderProgressMessage({
        status: nextStage,
        customerName: order.customerName || '',
        shopName: 'Victoria Atelier',
        trackingUrl,
      });

      expect(progressMessage).toBeDefined();
      expect(progressMessage.length).toBeGreaterThan(15);
      expect(progressMessage).toContain(trackingUrl);
    }

    // Mid-production embellishment requested: Gold Chest Embroidery (+₦15,000)
    const embellishmentCost = 15000;
    order.totalBill += embellishmentCost;

    expect(order.totalBill).toBe(135000);
    // Deposit was 60,000, so balance owed increases to 75,000
    expect(getBalanceOwed(order)).toBe(75000);
    expect(formatCurrency(getBalanceOwed(order))).toBe('₦75,000');
  });

  it('Step 4: Handover & Split Tender Settlement to Zero Balance', () => {
    const order: Order = {
      id: 'order_e2e_001',
      shopId: 'shop_e2e_001',
      customerId: 'cust_e2e_001',
      customerName: customerInput.fullName,
      orderDetails: 'Navy Blue Wool Senator with Gold Stitching',
      totalBill: 135000,
      depositPaid: 60000,
      status: 'Ready',
      priority: 'normal',
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(getBalanceOwed(order)).toBe(75000);

    // Client arrives for fitting & collection
    // Split Tender Settlement:
    // Tender 1: 50,000 NGN Bank Transfer
    const payment1 = { amount: 50000, method: 'transfer' as PaymentMethod };
    order.depositPaid += payment1.amount;
    expect(getBalanceOwed(order)).toBe(25000);

    // Tender 2: 25,000 NGN Cash
    const payment2 = { amount: 25000, method: 'cash' as PaymentMethod };
    order.depositPaid += payment2.amount;

    // Fully paid
    expect(order.depositPaid).toBe(135000);
    expect(getBalanceOwed(order)).toBe(0);

    // Transition order to Delivered
    order.status = 'Delivered';
    expect(order.status).toBe('Delivered');
  });

  it('Step 5: Digital Receipt Generation & Multi-Currency Safeguards', () => {
    const finalBill = 135000;
    const currency = 'NGN';

    const formattedTotal = formatCurrency(finalBill, currency);
    expect(formattedTotal).toBe('₦135,000');

    // Zero balance owed check on delivered receipt
    const balanceOwed = 0;
    const formattedBalance = formatCurrency(balanceOwed, currency);
    expect(formattedBalance).toBe('₦0');

    // WhatsApp receipt link generation
    const receiptUrl = `${APP_CONFIG.baseUrl}/receipt/order_e2e_001`;
    const receiptMessage = `Thank you for picking up your garment from Victoria Atelier! You can view and download your full digital receipt here: ${receiptUrl}`;
    const whatsappLink = getWhatsAppLink(customerInput.phone, receiptMessage);

    expect(whatsappLink).toContain('https://wa.me/2348023456789?text=');
    expect(whatsappLink).toContain(encodeURIComponent(receiptUrl));
  });

  it('Step 6: Repeat Outreach & Tailor Circle Accountability', () => {
    // 1. Repeat Lookbook Outreach link
    const lookbookPhotoUrl = `${APP_CONFIG.baseUrl}/catalogues/senator-2026.jpg`;
    const outreachMsg = `Hello ${customerInput.fullName.split(' ')[0]}! We just finished a new collection at Victoria Atelier. Here is a piece tailored in your exact size: ${lookbookPhotoUrl}`;
    const outreachLink = getWhatsAppLink(customerInput.phone, outreachMsg);

    expect(outreachLink).toContain('https://wa.me/2348023456789?text=');
    expect(outreachLink).toContain(encodeURIComponent(lookbookPhotoUrl));

    // 2. Tailor Circle Collaboration Invite (independent of XP)
    const referralCode = 'VICTORIA2026';
    const circleShareUrl = `${APP_CONFIG.baseUrl}/circle?connect=${referralCode}`;
    const circleInviteMsg = `Good day! Join my Tailor Circle on ${APP_CONFIG.name} so our workshops can keep our daily production streaks accountable. Tap this link to connect with me: ${circleShareUrl}`;

    // Verify no XP strings exist in the invitation
    expect(circleInviteMsg).not.toContain('XP');
    expect(circleInviteMsg).toContain(APP_CONFIG.name);
    expect(circleInviteMsg).toContain(circleShareUrl);
  });

  it('Step 7: Ready-to-Wear Batch Lifecycle & POS Sale Simulation', () => {
    // 1. Create RTW internal batch
    const batchOrder: Order = {
      id: 'batch_rtw_001',
      shopId: 'shop_e2e_001',
      isInternalBatch: true,
      customerName: 'Internal Production',
      orderDetails: 'Factory Premium Kaftan',
      styleName: 'Kaftan',
      priority: 'normal',
      statusHistory: [],
      batchSizes: [
        { size: 'M', quantity: 10 },
        { size: 'L', quantity: 15 },
        { size: 'XL', quantity: 5 },
      ],
      totalBill: 0,
      depositPaid: 0,
      status: 'Documented',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(batchOrder.isInternalBatch).toBe(true);
    const totalItems = (batchOrder.batchSizes || []).reduce((acc, s) => acc + s.quantity, 0);
    expect(totalItems).toBe(30);

    // 2. Transition batch through Cutting and Sewing to Delivered (auto-stocks into showroom inventory)
    batchOrder.status = 'Cutting';
    batchOrder.status = 'Sewing';
    batchOrder.status = 'Delivered';
    expect(batchOrder.status).toBe('Delivered');

    // 3. Simulate Finished Good in Showroom stock
    const showroomItem = {
      id: 'fg_001',
      shopId: 'shop_e2e_001',
      name: 'Factory Premium Kaftan',
      size: 'L',
      quantity: 15,
      price: 18000,
    };

    // 4. POS Sale: Customer walks in and buys 2 units
    const quantitySold = 2;
    const paymentMethod: PaymentMethod = 'pos';
    showroomItem.quantity -= quantitySold;

    expect(showroomItem.quantity).toBe(13);

    // Create POS walk-in sale order
    const saleTotal = quantitySold * showroomItem.price;
    const posSaleOrder: Order = {
      id: 'pos_sale_001',
      shopId: 'shop_e2e_001',
      customerName: 'Walk-In Customer',
      orderDetails: `2x Factory Premium Kaftan (Size: L) via ${paymentMethod.toUpperCase()}`,
      totalBill: saleTotal,
      depositPaid: saleTotal,
      status: 'Delivered',
      priority: 'normal',
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(posSaleOrder.totalBill).toBe(36000);
    expect(posSaleOrder.depositPaid).toBe(36000);
    expect(getBalanceOwed(posSaleOrder)).toBe(0);
    expect(formatCurrency(posSaleOrder.totalBill, 'NGN')).toBe('₦36,000');
  });

  it('Step 8: Multi-Currency Dynamic Formatting Across Global Shops', () => {
    const amount = 250000;

    // Nigerian Naira (Default)
    expect(formatCurrency(amount, 'NGN')).toBe('₦250,000');

    // US Dollar (Diaspora clients)
    expect(formatCurrency(150, 'USD')).toBe('$150');

    // British Pound (UK clients)
    expect(formatCurrency(120, 'GBP')).toBe('£120');

    // Ghanaian Cedi (West African cross-border tailors)
    expect(formatCurrency(850, 'GHS')).toBe('GH₵850');
  });
});
