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
import { toggleOrderReminderMuteAction } from '@/app/actions';
import styles from '../page.module.css';

interface OrderPaymentsProps {
  orderId: string;
  customerId: string;
  walletBalance: number;
  totalBill: number;
  initialAmountPaid: number;
  currency?: string;
  initialMuteBalance?: boolean;
  onPaymentAdded: (newTotalPaid: number) => void;
  onMuteToggled?: (muted: boolean) => void;
}

export default function OrderPayments({
  orderId,
  customerId,
  walletBalance,
  totalBill,
  initialAmountPaid,
  currency,
  initialMuteBalance,
  onPaymentAdded,
  onMuteToggled,
}: OrderPaymentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(Boolean(initialMuteBalance));
  const [togglingMute, setTogglingMute] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setIsMuted(Boolean(initialMuteBalance));
  }, [initialMuteBalance]);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) || initialAmountPaid;
  const balance = Math.max(0, totalBill - totalPaid);

  async function handleToggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    setTogglingMute(true);
    const nextVal = !isMuted;
    try {
      const res = await toggleOrderReminderMuteAction(orderId, 'mute_balance_reminders', nextVal);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        setIsMuted(nextVal);
        onMuteToggled?.(nextVal);
        showToast(nextVal ? 'Balance reminders muted for this order' : 'Balance reminders re-enabled', 'success');
      }
    } catch {
      showToast('Failed to update balance reminder setting', 'error');
    } finally {
      setTogglingMute(false);
    }
  }

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
      showToast(`Insufficient store credit. Available: ${formatCurrency(walletBalance, currency)}`, 'error');
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
          showToast(`Payment logged! ${formatCurrency(overpayment, currency)} added to customer's wallet as Store Credit.`, 'success');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Payment Ledger</h3>
          {isMuted && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--sf-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--sf-bg-surface-elevated, #f3f4f6)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid var(--sf-border-light, #e5e7eb)',
              }}
              title="Automated reminders for this balance are muted"
            >
              <Symbol name="notifications_off" size={12} />
              <span>Reminders Muted</span>
            </span>
          )}
        </div>
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
            {balance > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  disabled={togglingMute}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '16px',
                    border: '1px solid var(--sf-border-light, #e5e7eb)',
                    background: isMuted ? 'var(--sf-bg-surface-elevated, #f3f4f6)' : 'transparent',
                    color: isMuted ? 'var(--sf-text-secondary)' : 'var(--sf-text-primary)',
                    cursor: 'pointer',
                  }}
                  title={isMuted ? 'Click to re-enable automated reminders for this balance' : 'Silence automated reminders for this balance'}
                >
                  <Symbol name={isMuted ? 'notifications_off' : 'notifications'} size={14} />
                  <span>{isMuted ? 'Balance Reminders Muted' : 'Mute Balance Reminders'}</span>
                </button>
              </div>
            )}
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
                      ...(walletBalance > 0 ? [{ value: 'store_credit', label: `Store Credit (${formatCurrency(walletBalance, currency)})` }] : []),
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
