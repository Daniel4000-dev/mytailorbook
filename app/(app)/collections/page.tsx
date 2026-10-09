'use client';

import { useData } from '@/contexts/DataContext';
import { formatCurrency, getWhatsAppLink } from '@/lib/formatters';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import styles from './page.module.css';
import type { Order, Customer } from '@/lib/types';
import { useState, useMemo } from 'react';
import TopBar from '@/components/layout/TopBar/TopBar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import { useToast } from '@/contexts/ToastContext';
import { addPayment } from '@/app/actions/order_payments';
import type { PaymentMethod } from '@/lib/types';

interface DebtorOrder {
  order: Order;
  customer: Customer;
  balance: number;
}

export default function CollectionsPage() {
  const { orders, customers, currentShop, updateOrder } = useData();
  const currency = currentShop?.currency || 'NGN';
  const { showToast } = useToast();

  const [payingDebtor, setPayingDebtor] = useState<DebtorOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('transfer');
  const [payNote, setPayNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebtor) return;
    const numAmount = parseInt(payAmount) || 0;
    if (numAmount <= 0) return;

    setIsSubmitting(true);
    const { error } = await addPayment(payingDebtor.order.id, numAmount, payMethod, payNote);
    setIsSubmitting(false);

    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Payment logged successfully', 'success');
      // Update local state so it disappears from the list
      updateOrder(payingDebtor.order.id, { depositPaid: (payingDebtor.order.depositPaid || 0) + numAmount });
      setPayingDebtor(null);
      setPayAmount('');
      setPayNote('');
    }
  };

  const debtors = useMemo(() => {
    if (!orders || !customers) return [];
    
    const unpaid: DebtorOrder[] = [];
    
    orders.forEach(order => {
      const balance = (order.totalBill || 0) - (order.depositPaid || 0);
      if (balance > 0) {
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) {
          unpaid.push({ order, customer, balance });
        }
      }
    });

    // Sort by largest balance first
    return unpaid.sort((a, b) => b.balance - a.balance);
  }, [orders, customers]);

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.balance, 0);
  const totalDebtorsCount = new Set(debtors.map(d => d.customer.id)).size;

  const handleWhatsAppReminder = (debtor: DebtorOrder) => {
    const amount = formatCurrency(debtor.balance, currency);
    const message = `Hello ${debtor.customer.fullName},\n\nThis is a gentle reminder regarding the outstanding balance of ${amount} for your order "${debtor.order.orderDetails}".\n\nPlease let us know when we can expect payment. Thank you!`;
    const link = getWhatsAppLink(debtor.customer.whatsappNumber, message);
    window.open(link, '_blank');
  };

  return (
    <>
      <TopBar title="Collections" showBack />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Collections & Debtors</h1>
          <p className={styles.subtitle}>Track unpaid balances and send reminders</p>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Outstanding</span>
            <span className={`${styles.summaryValue} ${totalOutstanding > 0 ? styles.danger : ''}`}>
              {formatCurrency(totalOutstanding, currency)}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Oweing Clients</span>
            <span className={styles.summaryValue}>{totalDebtorsCount}</span>
          </div>
        </div>

        <h2 className={styles.listTitle}>Unpaid Orders</h2>

        {debtors.length === 0 ? (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              icon={<Symbol name="check_circle" size={32} />}
              title="All clear!"
              description="No customers currently owe you money."
            />
          </div>
        ) : (
          <div>
            {debtors.map((debtor) => (
              <div key={debtor.order.id} className={styles.debtorCard}>
                <div className={styles.debtorHeader}>
                  <div className={styles.customerInfo}>
                    <span className={styles.customerName}>
                      {debtor.customer.fullName}
                    </span>
                    <span className={styles.orderTitle}>{debtor.order.orderDetails}</span>
                  </div>
                  <div className={styles.balanceInfo}>
                    <span className={styles.balanceLabel}>Balance</span>
                    <span className={styles.balanceAmount}>
                      {formatCurrency(debtor.balance, currency)}
                    </span>
                  </div>
                </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant="primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setPayingDebtor(debtor);
                    setPayAmount(debtor.balance.toString());
                  }}
                  icon={<Symbol name="payments" size={18} />}
                >
                  Quick Pay
                </Button>
                {debtor.customer.whatsappNumber && (
                  <Button 
                    style={{ flex: 1, backgroundColor: '#25D366', color: 'white' }}
                    onClick={() => handleWhatsAppReminder(debtor)}
                    icon={<Symbol name="chat" size={18} />}
                  >
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <BottomSheet
      isOpen={!!payingDebtor}
      onClose={() => setPayingDebtor(null)}
      title={`Log Payment`}
    >
      {payingDebtor && (
        <form onSubmit={handleQuickPaySubmit} style={{ padding: 'var(--sf-space-md)' }}>
          <div style={{ marginBottom: 'var(--sf-space-md)' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--sf-text-secondary)' }}>
              Logging payment for <strong>{payingDebtor.order.orderDetails}</strong>
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--sf-text-tertiary)' }}>
              Client: {payingDebtor.customer.fullName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <MoneyInput
                label="Amount"
                value={payAmount}
                onChange={setPayAmount}
                placeholder="e.g. 10000"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <Select
                label="Method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: 'transfer', label: 'Bank Transfer' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'pos', label: 'POS Terminal' },
                  { value: 'store_credit', label: 'Store Credit' },
                ]}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', marginBottom: '4px', display: 'block' }}>Note (Optional)</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. Deposit from GTBank"
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--sf-radius-md)', border: '1px solid var(--sf-border-default)', fontSize: '16px', background: 'var(--sf-bg-surface)', color: 'var(--sf-text-primary)' }}
              />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting || !payAmount}
            loading={isSubmitting}
          >
            Confirm Payment
          </Button>
        </form>
      )}
    </BottomSheet>
  </>
);
}
