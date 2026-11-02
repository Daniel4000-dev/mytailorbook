'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { getExpensesByDate, addExpense } from '@/app/actions/expenses';
import { getPaymentsByDate } from '@/app/actions/order_payments';
import type { Expense, Payment, ExpenseCategory, PaymentMethod } from '@/lib/types';
import { formatNumber, getCurrencySymbol } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import styles from './page.module.css';

interface CombinedTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  method: PaymentMethod;
  desc: string;
  time: string;
  orderId?: string;
  category?: string;
}

const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; shortLabel: string; icon: string }[] = [
  { key: 'material', label: 'Sewing Materials (Threads, Zips, Linings)', shortLabel: 'Materials', icon: 'content_cut' },
  { key: 'general', label: 'Generator Fuel / Workshop Power', shortLabel: 'Fuel & Power', icon: 'bolt' },
  { key: 'outsourced', label: 'Machine Needles & Repairs', shortLabel: 'Machine Repairs', icon: 'build' },
  { key: 'logistics', label: 'Delivery & Transport Fare', shortLabel: 'Delivery & Fare', icon: 'local_shipping' },
  { key: 'labor', label: 'Artisan & Apprentice Wages', shortLabel: 'Wages', icon: 'engineering' },
];

export default function ReconciliationPage() {
  const { currentShop, orders } = useData();
  const { user, isOwner } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const currencySymbol = getCurrencySymbol(currentShop?.currency || 'NGN');

  // Role Gate
  useEffect(() => {
    if (user && !isOwner && user.role !== 'Accountant') {
      router.push('/');
    }
  }, [user, isOwner, router]);

  // Selected date (ISO string YYYY-MM-DD)
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Method filter: 'all' | 'cash' | 'transfer' | 'pos'
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'transfer' | 'pos'>('all');

  // Quick Expense BottomSheet state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('material');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDescription, setExpDescription] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Cash Count / Reconcile BottomSheet state
  const [countModalOpen, setCountModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');

  // Fetch reconciliation data for selected date
  useEffect(() => {
    if (!currentShop?.id) return;
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        const [expensesData, paymentsRes] = await Promise.all([
          getExpensesByDate(currentShop!.id, date),
          getPaymentsByDate(currentShop!.id, date),
        ]);

        if (isMounted) {
          setExpenses(expensesData || []);
          setPayments(paymentsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch reconciliation data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentShop?.id, date]);

  // Synthesized fallback payments when offline or in demo mode without Supabase payment rows
  const activePayments: Payment[] = useMemo(() => {
    if (payments.length > 0) return payments;
    // Derive from shop orders with deposits matching the selected date (or today)
    const today = new Date().toISOString().split('T')[0];
    return (orders || [])
      .filter((o) => {
        if (!o.depositPaid || o.depositPaid <= 0) return false;
        const orderDate = o.createdAt ? o.createdAt.split('T')[0] : today;
        return orderDate === date || (date === today && !o.createdAt);
      })
      .map((o) => ({
        id: `ord-dep-${o.id}`,
        shop_id: o.shopId,
        order_id: o.id,
        amount: o.depositPaid,
        method: 'cash' as PaymentMethod,
        reference_note: `Deposit: ${o.orderDetails || 'Bespoke Garment'} (${o.customerName || 'Client'})`,
        date: date,
        created_at: o.createdAt || new Date().toISOString(),
      }));
  }, [payments, orders, date]);

  // Calculations
  const cashIn = activePayments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const transferIn = activePayments.filter((p) => p.method === 'transfer').reduce((sum, p) => sum + p.amount, 0);
  const posIn = activePayments.filter((p) => p.method === 'pos').reduce((sum, p) => sum + p.amount, 0);

  const cashOut = expenses.filter((e) => e.method === 'cash').reduce((sum, e) => sum + e.amount, 0);
  const transferOut = expenses.filter((e) => e.method === 'transfer').reduce((sum, e) => sum + e.amount, 0);

  const expectedTill = cashIn - cashOut;
  const totalElectronicIn = transferIn + posIn;
  const totalExpenses = cashOut + transferOut;
  const totalInflows = cashIn + totalElectronicIn;

  // Prepare combined transactions
  const transactions: CombinedTransaction[] = useMemo(() => {
    const list: CombinedTransaction[] = [
      ...activePayments.map((p) => ({
        id: `p-${p.id}`,
        type: 'income' as const,
        amount: p.amount,
        method: (p.method || 'cash') as PaymentMethod,
        desc: p.reference_note || 'Client Order Payment',
        time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        orderId: p.order_id,
      })),
      ...expenses.map((e) => ({
        id: `e-${e.id}`,
        type: 'expense' as const,
        amount: e.amount,
        method: (e.method || 'cash') as PaymentMethod,
        desc: e.description || e.category,
        category: e.category,
        time: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        orderId: e.orderId,
      })),
    ];

    return list.sort((a, b) => b.time.localeCompare(a.time));
  }, [activePayments, expenses]);

  // Filtered by selected method
  const filteredTransactions = useMemo(() => {
    if (methodFilter === 'all') return transactions;
    return transactions.filter((t) => t.method === methodFilter);
  }, [transactions, methodFilter]);

  // Date Navigator Helpers
  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split('T')[0];
  })();

  const isToday = date === todayStr;
  const isYesterday = date === yesterdayStr;

  const displayDateText = useMemo(() => {
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [date, isToday, isYesterday]);

  // Handle Quick Expense Submission
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(expAmount.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }

    if (!currentShop?.id) return;
    setIsSubmittingExpense(true);

    try {
      const newExp = await addExpense({
        shopId: currentShop.id,
        amount: numAmount,
        category: expCategory,
        description: expDescription.trim() || EXPENSE_CATEGORIES.find((c) => c.key === expCategory)?.shortLabel || 'Workshop Expense',
        date: date,
        method: expMethod,
      });

      setExpenses((prev) => [newExp as Expense, ...prev]);
      showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} recorded in ${expMethod.toUpperCase()}`, 'success');
      setExpenseModalOpen(false);
      setExpAmount('');
      setExpDescription('');
    } catch (err: any) {
      // In offline / demo mode fallback
      const mockExp: Expense = {
        id: `mock-exp-${Date.now()}`,
        shopId: currentShop.id,
        amount: numAmount,
        category: expCategory,
        description: expDescription.trim() || 'Workshop Expense',
        date: date,
        method: expMethod,
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => [mockExp, ...prev]);
      showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} recorded!`, 'success');
      setExpenseModalOpen(false);
      setExpAmount('');
      setExpDescription('');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Difference calculation for cash drawer verification
  const countedNum = parseFloat(countedCash.replace(/,/g, ''));
  const hasCountedInput = !isNaN(countedNum);
  const countDiff = hasCountedInput ? countedNum - expectedTill : 0;

  return (
    <PageLayout
      width="narrow"
      padding="none"
      header={
        <TopBar
          title="Cash Drawer"
          subtitle="Daily cash in hand, expenses & payments received"
          showBack
          onBack={() => router.push(ROUTES.dashboard)}
        />
      }
    >
      <div className={styles.container}>
        {/* ── 1. ATELIER COMPACT DATE NAVIGATOR ── */}
        <section className={styles.dateBar}>
          <div className={styles.dateNavLeft}>
            <button
              type="button"
              className={styles.chevronBtn}
              onClick={() => changeDate(-1)}
              aria-label="Previous day"
            >
              <Symbol name="chevron_left" size={20} />
            </button>
            <div className={styles.datePillGroup}>
              <button
                type="button"
                className={`${styles.datePill} ${isYesterday ? styles.datePillActive : ''}`}
                onClick={() => setDate(yesterdayStr)}
              >
                Yesterday
              </button>
              <button
                type="button"
                className={`${styles.datePill} ${isToday ? styles.datePillActive : ''}`}
                onClick={() => setDate(todayStr)}
              >
                Today
              </button>
            </div>
            <button
              type="button"
              className={styles.chevronBtn}
              onClick={() => changeDate(1)}
              disabled={isToday}
              aria-label="Next day"
            >
              <Symbol name="chevron_right" size={20} />
            </button>
          </div>

          <label className={styles.calendarPickerBtn} htmlFor="reconDateInput">
            <Symbol name="calendar_today" size={15} />
            <span>{displayDateText}</span>
            <input
              id="reconDateInput"
              type="date"
              className={styles.hiddenDateInput}
              value={date}
              max={todayStr}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
        </section>

        {loading ? (
          <div className={styles.loadingState}>
            <Symbol name="progress_activity" size={28} className="global-spinner" />
            <p>Loading cash drawer records…</p>
          </div>
        ) : (
          <>
            {/* ── 2. CONSOLIDATED MASTER CASH COCKPIT ── */}
            <section className={styles.cockpitCard}>
              <div className={styles.cockpitTop}>
                <div className={styles.cockpitHeaderRow}>
                  <div className={styles.cockpitTitleWrap}>
                    <div className={styles.cashIconWrap}>
                      <Symbol name="point_of_sale" size={18} />
                    </div>
                    <span className={styles.cockpitEyebrow}>Physical Cash in Drawer</span>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${expectedTill >= 0 ? styles.statusBadgeGood : styles.statusBadgeDeficit}`}
                  >
                    {expectedTill >= 0 ? 'Cash on Hand' : 'Deficit / Short'}
                  </span>
                </div>

                <div className={styles.mainAmountRow}>
                  <span className={styles.mainAmountNumeral}>
                    {currencySymbol}{formatNumber(expectedTill)}
                  </span>
                </div>

                <div className={styles.cashMovementSubtitle}>
                  <span>+{currencySymbol}{formatNumber(cashIn)} cash received</span>
                  <span className={styles.movementDot}>·</span>
                  <span>−{currencySymbol}{formatNumber(cashOut)} cash paid out</span>
                </div>
              </div>

              <div className={styles.cockpitDivider} />

              <div className={styles.cockpitShelf}>
                <div className={styles.shelfCol}>
                  <span className={styles.shelfLabel}>Bank &amp; POS In</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(totalElectronicIn)}</span>
                  <span className={styles.shelfSubtext}>Transfers received</span>
                </div>

                <div className={styles.shelfCol}>
                  <span className={styles.shelfLabel}>Total Outflows</span>
                  <span className={`${styles.shelfValue} ${styles.shelfExpense}`}>
                    −{currencySymbol}{formatNumber(totalExpenses)}
                  </span>
                  <span className={styles.shelfSubtext}>Materials &amp; bills</span>
                </div>

                <div className={styles.shelfCol}>
                  <span className={styles.shelfLabel}>Total Inflows</span>
                  <span className={`${styles.shelfValue} ${styles.shelfIncome}`}>
                    +{currencySymbol}{formatNumber(totalInflows)}
                  </span>
                  <span className={styles.shelfSubtext}>All payment modes</span>
                </div>
              </div>
            </section>

            {/* ── 3. ATELIER ACTION COCKPIT ── */}
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => setExpenseModalOpen(true)}
              >
                <Symbol name="receipt_long" size={16} />
                <span>Record Expense</span>
              </button>

              <button
                type="button"
                className={styles.secondaryActionBtn}
                onClick={() => {
                  setCountedCash('');
                  setCountModalOpen(true);
                }}
              >
                <Symbol name="calculate" size={16} />
                <span>Count &amp; Verify Till</span>
              </button>
            </div>

            {/* ── 4. APPLE IOS SEGMENTED METHOD FILTER ── */}
            <div className={styles.methodSegmentedWrap} role="tablist" aria-label="Payment Method Filters">
              <div className={styles.methodSegmentedControl}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'all'}
                  className={`${styles.methodSegmentBtn} ${methodFilter === 'all' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setMethodFilter('all')}
                >
                  <span>All</span>
                  <span className={styles.methodSegmentCount}>{transactions.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'cash'}
                  className={`${styles.methodSegmentBtn} ${methodFilter === 'cash' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setMethodFilter('cash')}
                >
                  <span>Cash</span>
                  <span className={styles.methodSegmentCount}>
                    {transactions.filter((t) => t.method === 'cash').length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'transfer'}
                  className={`${styles.methodSegmentBtn} ${methodFilter === 'transfer' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setMethodFilter('transfer')}
                >
                  <span>Transfer</span>
                  <span className={styles.methodSegmentCount}>
                    {transactions.filter((t) => t.method === 'transfer').length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'pos'}
                  className={`${styles.methodSegmentBtn} ${methodFilter === 'pos' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setMethodFilter('pos')}
                >
                  <span>POS</span>
                  <span className={styles.methodSegmentCount}>
                    {transactions.filter((t) => t.method === 'pos').length}
                  </span>
                </button>
              </div>
            </div>

            {/* ── 5. INSET GROUPED DAILY AUDIT LEDGER ── */}
            <section className={styles.ledgerSection}>
              <div className={styles.ledgerHeaderRow}>
                <h3 className={styles.ledgerSectionTitle}>
                  Daily Audit Ledger
                </h3>
                <span className={styles.ledgerMutedSummary}>
                  {filteredTransactions.filter((t) => t.type === 'income').length} in · {filteredTransactions.filter((t) => t.type === 'expense').length} out
                </span>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className={styles.emptyContainer}>
                  <EmptyState
                    icon={<Symbol name="account_balance_wallet" size={32} />}
                    title="No Transactions on this Date"
                    description={`No ${methodFilter === 'all' ? '' : methodFilter.toUpperCase() + ' '}receipts or workshop disbursements logged for ${displayDateText}.`}
                    action={{
                      label: 'Record Expense',
                      onClick: () => setExpenseModalOpen(true),
                    }}
                  />
                </div>
              ) : (
                <div className={styles.ledgerCard}>
                  {filteredTransactions.map((t) => (
                    <div
                      key={t.id}
                      className={`${styles.ledgerRow} ${t.orderId ? styles.ledgerRowClickable : ''}`}
                      onClick={() => {
                        if (t.orderId) {
                          router.push(ROUTES.productionOrder(t.orderId));
                        }
                      }}
                      role={t.orderId ? 'button' : undefined}
                      tabIndex={t.orderId ? 0 : undefined}
                    >
                      <div className={styles.ledgerLeft}>
                        <div
                          className={`${styles.flowIconWrap} ${t.type === 'income' ? styles.incomeIcon : styles.expenseIcon}`}
                        >
                          <Symbol
                            name={t.type === 'income' ? 'south_west' : 'north_east'}
                            size={16}
                          />
                        </div>
                        <div className={styles.ledgerDetails}>
                          <span className={styles.ledgerTitle}>{t.desc}</span>
                          <div className={styles.ledgerMeta}>
                            <span>{t.time}</span>
                            <span className={styles.metaDot}>·</span>
                            <span className={styles.methodBadge}>{t.method.toUpperCase()}</span>
                            {t.category && (
                              <>
                                <span className={styles.metaDot}>·</span>
                                <span className={styles.categoryName}>
                                  {EXPENSE_CATEGORIES.find((c) => c.key === t.category)?.shortLabel || t.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.ledgerRight}>
                        <span
                          className={`${styles.ledgerAmount} ${t.type === 'income' ? styles.amountIncome : styles.amountExpense}`}
                        >
                          {t.type === 'income' ? '+' : '−'}
                          {currencySymbol}
                          {formatNumber(t.amount)}
                        </span>
                        {t.orderId && (
                          <Symbol name="chevron_right" size={14} className={styles.ledgerChevron} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── 6. RECORD WORKSHOP EXPENSE SHEET ── */}
      <BottomSheet
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Record Workshop Expense"
      >
        <form onSubmit={handleRecordExpense} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="expAmountInput">
              Amount Spent ({currencySymbol})
            </label>
            <div className={styles.amountInputWrap}>
              <span className={styles.currencyPrefix}>{currencySymbol}</span>
              <input
                id="expAmountInput"
                type="text"
                inputMode="decimal"
                className={styles.amountInput}
                placeholder="0"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Payment Source</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'cash' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('cash')}
              >
                <Symbol name="payments" size={18} />
                <span>Cash from Drawer</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'transfer' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('transfer')}
              >
                <Symbol name="account_balance" size={18} />
                <span>Bank Transfer</span>
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Expense Category</label>
            <div className={styles.categoryChips}>
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.categoryChip} ${expCategory === c.key ? styles.categoryChipActive : ''}`}
                  onClick={() => setExpCategory(c.key)}
                >
                  <Symbol name={c.icon} size={15} />
                  <span>{c.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="expDescInput">
              Supplier / Note (Optional)
            </label>
            <input
              id="expDescInput"
              type="text"
              className={styles.textInput}
              placeholder="e.g. 5 spools black thread + 4 YKK zips"
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setExpenseModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.modalSubmitBtn}
              disabled={isSubmittingExpense || !expAmount.trim()}
            >
              {isSubmittingExpense ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* ── 7. COUNT & VERIFY TILL BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={countModalOpen}
        onClose={() => setCountModalOpen(false)}
        title="Count & Verify Cash Drawer"
      >
        <div className={styles.verifyModalContent}>
          <p className={styles.verifyIntro}>
            Count the physical paper banknotes currently in your cash drawer to confirm they match your expected workshop till.
          </p>

          <div className={styles.verifyExpectedCard}>
            <span className={styles.verifyExpectedLabel}>Expected Cash in Drawer</span>
            <span className={styles.verifyExpectedAmount}>
              {currencySymbol}{formatNumber(expectedTill)}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="actualCountInput">
              Actual Cash Counted in Hand ({currencySymbol})
            </label>
            <div className={styles.amountInputWrap}>
              <span className={styles.currencyPrefix}>{currencySymbol}</span>
              <input
                id="actualCountInput"
                type="text"
                inputMode="decimal"
                className={styles.amountInput}
                placeholder="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {hasCountedInput && (
            <div
              className={`${styles.differenceCard} ${
                countDiff === 0
                  ? styles.diffBalanced
                  : countDiff > 0
                    ? styles.diffOver
                    : styles.diffShort
              }`}
            >
              <div className={styles.diffHeader}>
                <Symbol
                  name={countDiff === 0 ? 'check_circle' : countDiff > 0 ? 'trending_up' : 'warning'}
                  size={20}
                />
                <span className={styles.diffTitle}>
                  {countDiff === 0
                    ? 'Drawer Balances Perfectly!'
                    : countDiff > 0
                      ? `Surplus: +${currencySymbol}${formatNumber(countDiff)}`
                      : `Shortage: −${currencySymbol}${formatNumber(Math.abs(countDiff))}`}
                </span>
              </div>
              <p className={styles.diffDesc}>
                {countDiff === 0
                  ? 'Your physical cash in hand matches the cash records exactly.'
                  : countDiff > 0
                    ? 'You have more cash in the drawer than recorded. Check if a client deposit was not logged.'
                    : 'Physical cash is lower than expected. Check if an unrecorded cash payout was made for fuel, thread, or delivery.'}
              </p>
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalPrimaryFullBtn}
              onClick={() => setCountModalOpen(false)}
            >
              Done Counting
            </button>
          </div>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
