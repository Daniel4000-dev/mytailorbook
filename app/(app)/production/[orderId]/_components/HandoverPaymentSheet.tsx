'use client';

import { useState, useEffect } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatCurrency } from '@/lib/formatters';
import type { Order, Customer, PaymentMethod } from '@/lib/types';
import styles from './HandoverPaymentSheet.module.css';

export interface SplitPaymentItem {
  amount: number;
  method: PaymentMethod;
  note?: string;
}

interface HandoverPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customer: Customer | null;
  balanceOwed: number;
  currency?: string;
  walletBalance?: number;
  onRecordPaymentAndDeliver: (amount: number, method: PaymentMethod, note?: string) => Promise<void>;
  onRecordSplitPaymentAndDeliver?: (payments: SplitPaymentItem[]) => Promise<void>;
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
  onRecordSplitPaymentAndDeliver,
  onDeliverWithBalanceDue,
}: HandoverPaymentSheetProps) {
  const [amount, setAmount] = useState(String(balanceOwed));
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');
  
  // Split payment state
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitAmount1, setSplitAmount1] = useState('');
  const [splitMethod1, setSplitMethod1] = useState<PaymentMethod>('transfer');
  const [splitNote1, setSplitNote1] = useState('');
  const [splitAmount2, setSplitAmount2] = useState('');
  const [splitMethod2, setSplitMethod2] = useState<PaymentMethod>('cash');
  const [splitNote2, setSplitNote2] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeliveringDue, setIsDeliveringDue] = useState(false);

  // Initialize split amounts when split mode is enabled
  useEffect(() => {
    if (isSplitMode && balanceOwed > 0) {
      const half = Math.floor(balanceOwed / 2);
      setSplitAmount1(String(half));
      setSplitAmount2(String(balanceOwed - half));
    }
  }, [isSplitMode, balanceOwed]);

  const parsedAmount = parseInt(amount.replace(/,/g, '')) || 0;
  const parsedSplit1 = parseInt(splitAmount1.replace(/,/g, '')) || 0;
  const parsedSplit2 = parseInt(splitAmount2.replace(/,/g, '')) || 0;
  const totalSplit = parsedSplit1 + parsedSplit2;

  const handleAutoBalance = () => {
    const remaining = Math.max(0, balanceOwed - parsedSplit1);
    setSplitAmount2(String(remaining));
  };

  const handleRecordAndDeliver = async () => {
    setIsSubmitting(true);
    try {
      if (isSplitMode) {
        const payments: SplitPaymentItem[] = [];
        if (parsedSplit1 > 0) {
          payments.push({
            amount: parsedSplit1,
            method: splitMethod1,
            note: splitNote1.trim() || undefined,
          });
        }
        if (parsedSplit2 > 0) {
          payments.push({
            amount: parsedSplit2,
            method: splitMethod2,
            note: splitNote2.trim() || undefined,
          });
        }
        if (payments.length === 0) return;

        if (onRecordSplitPaymentAndDeliver) {
          await onRecordSplitPaymentAndDeliver(payments);
        } else {
          // Fallback sequential
          for (const p of payments) {
            await onRecordPaymentAndDeliver(p.amount, p.method, p.note);
          }
        }
      } else {
        if (parsedAmount <= 0) return;
        await onRecordPaymentAndDeliver(parsedAmount, method, note.trim() || undefined);
      }
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

  const methodOptions = [
    { value: 'transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'pos', label: 'POS Terminal' },
    ...(walletBalance > 0 ? [{ value: 'store_credit', label: `Store Credit (${formatCurrency(walletBalance, currency)})` }] : []),
  ];

  const canSubmit = isSplitMode ? totalSplit > 0 : parsedAmount > 0;
  const actionButtonLabel = isSplitMode
    ? `Record ${formatCurrency(totalSplit, currency)} (${formatCurrency(parsedSplit1, currency)} + ${formatCurrency(parsedSplit2, currency)}) & Deliver`
    : `Record ${formatCurrency(parsedAmount, currency)} & Deliver`;

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
          <div className={styles.sectionHeaderFlex}>
            <label className={styles.sectionLabel}>Collect Balance</label>
            <button
              type="button"
              className={styles.splitToggleBtn}
              onClick={() => setIsSplitMode(!isSplitMode)}
            >
              <Symbol name={isSplitMode ? 'task_alt' : 'radio_button_unchecked'} size={15} />
              <span>Split Tender (2 Methods)</span>
            </button>
          </div>

          {!isSplitMode ? (
            <>
              <div className={styles.formGrid}>
                <MoneyInput
                  label={`Amount (${currency || 'NGN'})`}
                  value={amount}
                  onChange={setAmount}
                  required
                />
                <Select
                  label="Payment Method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  options={methodOptions}
                />
              </div>
              <input
                type="text"
                className={styles.noteInput}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reference note (optional, e.g. GTBank transfer)"
              />
            </>
          ) : (
            <div className={styles.splitBlock}>
              <div className={styles.splitCard}>
                <span className={styles.splitCardHeading}>Tender Part 1</span>
                <div className={styles.formGrid}>
                  <MoneyInput
                    label={`Amount (${currency || 'NGN'})`}
                    value={splitAmount1}
                    onChange={setSplitAmount1}
                    required
                  />
                  <Select
                    label="Method"
                    value={splitMethod1}
                    onChange={(e) => setSplitMethod1(e.target.value as PaymentMethod)}
                    options={methodOptions}
                  />
                </div>
                <input
                  type="text"
                  className={styles.noteInput}
                  value={splitNote1}
                  onChange={(e) => setSplitNote1(e.target.value)}
                  placeholder="Note 1 (optional, e.g. Transfer receipt #123)"
                />
              </div>

              <div className={styles.splitCard}>
                <div className={styles.splitCardHeaderFlex}>
                  <span className={styles.splitCardHeading}>Tender Part 2</span>
                  <button
                    type="button"
                    className={styles.autoBalanceBtn}
                    onClick={handleAutoBalance}
                    title="Calculate remaining balance automatically"
                  >
                    <Symbol name="calculate" size={13} />
                    <span>Auto-balance ({formatCurrency(Math.max(0, balanceOwed - parsedSplit1), currency)})</span>
                  </button>
                </div>
                <div className={styles.formGrid}>
                  <MoneyInput
                    label={`Amount (${currency || 'NGN'})`}
                    value={splitAmount2}
                    onChange={setSplitAmount2}
                    required
                  />
                  <Select
                    label="Method"
                    value={splitMethod2}
                    onChange={(e) => setSplitMethod2(e.target.value as PaymentMethod)}
                    options={methodOptions}
                  />
                </div>
                <input
                  type="text"
                  className={styles.noteInput}
                  value={splitNote2}
                  onChange={(e) => setSplitNote2(e.target.value)}
                  placeholder="Note 2 (optional, e.g. Cash collected)"
                />
              </div>

              <div className={styles.splitStatusRow}>
                <div className={styles.splitStatusIndicator}>
                  <span className={styles.splitStatusLabel}>Total Tendered:</span>
                  <strong className={styles.splitStatusAmount}>{formatCurrency(totalSplit, currency)}</strong>
                </div>
                {totalSplit === balanceOwed ? (
                  <span className={styles.splitStatusExact}>
                    <Symbol name="check_circle" size={14} /> Full Balance Cleared
                  </span>
                ) : totalSplit < balanceOwed ? (
                  <span className={styles.splitStatusPartial}>
                    {formatCurrency(balanceOwed - totalSplit, currency)} remains due on credit
                  </span>
                ) : (
                  <span className={styles.splitStatusExcess}>
                    Exceeds balance by {formatCurrency(totalSplit - balanceOwed, currency)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={!canSubmit || isDeliveringDue}
            onClick={handleRecordAndDeliver}
          >
            {actionButtonLabel}
          </Button>

          <div className={styles.dividerWithText}>OR DELIVER ON CREDIT</div>

          <Button
            variant="secondary"
            fullWidth
            loading={isDeliveringDue}
            disabled={isSubmitting}
            onClick={handleDeliverDue}
          >
            Deliver with {formatCurrency(balanceOwed, currency)} Balance Due
          </Button>
          <p className={styles.trustNote}>
            For trusted clients trying clothes or paying later. Balance remains tracked on their profile.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
