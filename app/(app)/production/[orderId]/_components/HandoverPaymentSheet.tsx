'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatCurrency } from '@/lib/formatters';
import type { Order, Customer, PaymentMethod } from '@/lib/types';
import styles from './HandoverPaymentSheet.module.css';

interface HandoverPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customer: Customer | null;
  balanceOwed: number;
  currency?: string;
  walletBalance?: number;
  onRecordPaymentAndDeliver: (amount: number, method: PaymentMethod, note?: string) => Promise<void>;
  onDeliverWithBalanceDue: () => Promise<void>;
}

export default function HandoverPaymentSheet({
  isOpen,
  onClose,
  order,
  customer,
  balanceOwed,
  currency,
  walletBalance = 0,
  onRecordPaymentAndDeliver,
  onDeliverWithBalanceDue,
}: HandoverPaymentSheetProps) {
  const [amount, setAmount] = useState(String(balanceOwed));
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeliveringDue, setIsDeliveringDue] = useState(false);

  const parsedAmount = parseInt(amount.replace(/,/g, '')) || 0;

  const handleRecordAndDeliver = async () => {
    if (parsedAmount <= 0) return;
    setIsSubmitting(true);
    try {
      await onRecordPaymentAndDeliver(parsedAmount, method, note.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliverDue = async () => {
    setIsDeliveringDue(true);
    try {
      await onDeliverWithBalanceDue();
    } finally {
      setIsDeliveringDue(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} variant="modal" noPadding>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <Symbol name="payments" size={24} />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.title}>Handover &amp; Balance</h3>
            <p className={styles.subtitle}>
              {customer?.fullName || order.customerName} has an outstanding balance
            </p>
          </div>
        </div>

        <div className={styles.balanceSummary}>
          <div className={styles.summaryRow}>
            <span>Total Bill</span>
            <span>{formatCurrency(order.totalBill, currency)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Deposit Paid</span>
            <span>{formatCurrency(order.depositPaid, currency)}</span>
          </div>
          <div className={styles.summaryRowTotal}>
            <span>Balance Outstanding</span>
            <span className={styles.balanceDueText}>{formatCurrency(balanceOwed, currency)}</span>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Collect Balance Now</label>
          <div className={styles.formGrid}>
            <MoneyInput
              label="Amount (₦)"
              value={amount}
              onChange={setAmount}
              required
            />
            <Select
              label="Payment Method"
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
          <input
            type="text"
            className={styles.noteInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reference note (optional, e.g. GTBank transfer)"
          />
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={parsedAmount <= 0 || isDeliveringDue}
            onClick={handleRecordAndDeliver}
          >
            Record ₦{parsedAmount.toLocaleString()} &amp; Deliver
          </Button>

          <div className={styles.dividerWithText}>OR DELIVER ON CREDIT</div>

          <Button
            variant="secondary"
            fullWidth
            loading={isDeliveringDue}
            disabled={isSubmitting}
            onClick={handleDeliverDue}
          >
            Deliver with ₦{balanceOwed.toLocaleString()} Balance Due
          </Button>
          <p className={styles.trustNote}>
            For trusted clients trying clothes or paying later. Balance remains tracked on their profile.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
