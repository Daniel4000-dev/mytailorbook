'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Payment, PaymentMethod } from '@/lib/types';
import { addPayment, getOrderPayments } from '@/app/actions/order_payments';
import { updateCustomerWallet } from '@/app/actions/customers';
import styles from '../page.module.css';

interface OrderPaymentsProps {
  orderId: string;
  customerId: string;
  walletBalance: number;
  totalBill: number;
  initialAmountPaid: number;
  currency?: string;
  onPaymentAdded: (newTotalPaid: number) => void;
}

export default function OrderPayments({ orderId, customerId, walletBalance, totalBill, initialAmountPaid, currency, onPaymentAdded }: OrderPaymentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) || initialAmountPaid;
  const balance = Math.max(0, totalBill - totalPaid);

  useEffect(() => {
    if (isOpen && payments.length === 0) {
      loadPayments();
    }
  }, [isOpen]);

  async function loadPayments() {
    setLoading(true);
    const { data, error } = await getOrderPayments(orderId);
    if (error) {
      showToast(error, 'error');
    } else if (data) {
      setPayments(data);
    }
    setLoading(false);
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseInt(amount) || 0;
    if (numAmount <= 0) return;

    if (method === 'store_credit' && numAmount > walletBalance) {
      showToast(`Insufficient store credit. Available: ₦${walletBalance}`, 'error');
      return;
    }

    // Calculate overpayment (only for non-store-credit methods)
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + initialAmountPaid;
    const balance = Math.max(0, totalBill - totalPaid);
    const overpayment = (method !== 'store_credit' && numAmount > balance) ? numAmount - balance : 0;

    setIsSubmitting(true);
    const { data, error } = await addPayment(orderId, numAmount, method, note);
    
    if (data) {
      if (method === 'store_credit') {
        // Deduct the store credit used
        await updateCustomerWallet(customerId, -numAmount);
      } else if (overpayment > 0) {
        // Add the overpayment to store credit
        const walletRes = await updateCustomerWallet(customerId, overpayment);
        if (!walletRes.success) {
          showToast('Payment logged, but failed to add store credit.', 'error');
        } else {
          showToast(`Payment logged! ₦${overpayment} added to customer's wallet as Store Credit.`, 'success');
        }
      }
    }
    
    setIsSubmitting(false);

    if (error) {
      showToast(error, 'error');
      return;
    }

    if (data) {
      const newPayments = [data, ...payments];
      setPayments(newPayments);
      setAmount('');
      setNote('');
      const newTotal = newPayments.reduce((sum, p) => sum + p.amount, 0);
      onPaymentAdded(newTotal);
      if (overpayment <= 0) {
        showToast('Payment logged successfully', 'success');
      }
    }
  }

  return (
    <section className={`${styles.card} ${styles.gaPayment}`}>
      <div 
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Payment Ledger</h3>
        <Symbol name={isOpen ? 'expand_less' : 'expand_more'} size={24} />
      </div>

      {isOpen && (
        <div style={{ marginTop: '16px' }}>
          <div className={styles.payRows}>
            <div className={styles.payRow}>
              <span className={styles.payLabel}>Total Bill</span>
              <span className={styles.payValue}>{formatCurrency(totalBill, currency)}</span>
            </div>
            <div className={styles.payRow}>
              <span className={styles.payLabel}>Total Paid</span>
              <span className={styles.payValueAccent} style={{ color: 'var(--sf-success)' }}>
                {formatCurrency(totalPaid, currency)}
              </span>
            </div>
            <div className={styles.payRowTotal}>
              <span>Balance Owed</span>
              <span className={balance > 0 ? styles.balanceDue : undefined}>
                {formatCurrency(balance, currency)}
              </span>
            </div>
          </div>

          {balance > 0 && (
            <form onSubmit={handleAddPayment} className={styles.payForm}>
              <label className={styles.capsLabel}>Log New Payment</label>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <MoneyInput
                    label="Amount"
                    value={amount}
                    onChange={setAmount}
                    placeholder="e.g. 10000"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    options={[
                      { value: 'transfer', label: 'Bank Transfer' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'pos', label: 'POS Terminal' },
                      ...(walletBalance > 0 ? [{ value: 'store_credit', label: `Store Credit (₦${walletBalance})` }] : []),
                    ]}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', marginBottom: '4px', display: 'block' }}>Note (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Deposit from GTBank"
                  className={styles.payInput}
                />
              </div>

              <button
                type="submit"
                className={styles.recordPayBtn}
                disabled={isSubmitting || !amount}
              >
                {isSubmitting && <Symbol name="progress_activity" className="global-spinner" />} Log Payment
              </button>
            </form>
          )}

          <div className={styles.payHistory}>
            <span className={styles.capsLabel}>Payment History</span>
            
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--sf-text-tertiary)', fontSize: '13px' }}>
                Loading payments...
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--sf-text-tertiary)', fontSize: '13px' }}>
                No payments logged yet.
              </div>
            ) : (
              payments.map(p => (
                <div key={p.id} className={styles.payHistoryRow} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--sf-border-light)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.method.replace('_', ' ')}</span>
                    {p.reference_note && <span style={{ fontSize: '12px', color: 'var(--sf-text-tertiary)' }}>{p.reference_note}</span>}
                    <span className={styles.payHistoryMeta} style={{ marginTop: '2px' }}>{formatDate(p.date)}</span>
                  </div>
                  <span className={styles.payHistoryAmount} style={{ color: 'var(--sf-success)' }}>
                    +{formatCurrency(p.amount, currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
