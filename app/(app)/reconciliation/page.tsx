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

const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; icon: string }[] = [
  { key: 'material', label: 'Sewing Materials (Threads, Zips, Lining, Stay)', icon: 'content_cut' },
  { key: 'general', label: 'Generator Fuel / Workshop Power', icon: 'bolt' },
  { key: 'outsourced', label: 'Machine Needles & Maintenance', icon: 'build' },
  { key: 'logistics', label: 'Delivery & Transport', icon: 'local_shipping' },
  { key: 'labor', label: 'Artisan & Apprentice Wages', icon: 'engineering' },
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
        reference_note: `Deposit: ${o.orderDetails || 'Bespoke Outfit'} (${o.customerName || 'Client'})`,
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
  const netCashflow = (cashIn + totalElectronicIn) - totalExpenses;

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

  const fullDateLabel = useMemo(() => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [date]);

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
        description: expDescription.trim() || EXPENSE_CATEGORIES.find((c) => c.key === expCategory)?.label || 'Shop Expense',
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

  return (
    <PageLayout
      width="narrow"
      padding="none"
      header={
        <TopBar
          title="Till Reconciliation"
          subtitle="Daily cash drawer audit & bank ledger"
          showBack
          onBack={() => router.push(ROUTES.production)}
        />
      }
    >
      <div className={styles.container}>
        {/* ── 1. APPLE INSET DATE NAVIGATOR ── */}
        <section className={styles.dateNavigator}>
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
                className={`${styles.dateQuickPill} ${isYesterday ? styles.dateQuickPillActive : ''}`}
                onClick={() => setDate(yesterdayStr)}
              >
                Yesterday
              </button>
              <button
                type="button"
                className={`${styles.dateQuickPill} ${isToday ? styles.dateQuickPillActive : ''}`}
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

          <div className={styles.calendarPickerWrap}>
            <label className={styles.calendarPickerBtn} htmlFor="reconDateInput">
              <Symbol name="calendar_today" size={16} />
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
          </div>
        </section>

        <div className={styles.dateSubtitleRow}>
          <span className={styles.dateLongText}>{fullDateLabel}</span>
          <span className={styles.netCashflowBadge} data-positive={netCashflow >= 0}>
            {netCashflow >= 0 ? '+' : '-'}{currencySymbol}{formatNumber(Math.abs(netCashflow))} Net
          </span>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <Symbol name="progress_activity" size={28} className="global-spinner" />
            <p>Auditing cash & bank transactions…</p>
          </div>
        ) : (
          <>
            {/* ── 2. HERO: ATELIER CASH DRAWER (TILL) CARD ── */}
            <section className={styles.tillHeroCard}>
              <div className={styles.tillHeroTop}>
                <div>
                  <span className={styles.tillHeroEyebrow}>ATELIER CASH DRAWER</span>
                  <h2 className={styles.tillHeroTitle}>Expected Physical Cash in Till</h2>
                </div>
                <div className={styles.tillCashBadge}>
                  <Symbol name="payments" size={20} />
                  <span>CASH</span>
                </div>
              </div>

              <div className={styles.tillAmountRow}>
                <span className={styles.tillAmountFigure}>
                  {currencySymbol}{formatNumber(expectedTill)}
                </span>
                <span className={styles.tillStatusTag} data-in-hand={expectedTill >= 0}>
                  {expectedTill >= 0 ? 'Cash On Hand' : 'Deficit / Overdrawn'}
                </span>
              </div>

              <div className={styles.tillFormulaBanner}>
                <div className={styles.formulaSegment}>
                  <span className={styles.formulaLabel}>Cash Collected</span>
                  <span className={styles.formulaValPositive}>+{currencySymbol}{formatNumber(cashIn)}</span>
                </div>
                <span className={styles.formulaOperator}>−</span>
                <div className={styles.formulaSegment}>
                  <span className={styles.formulaLabel}>Cash Paid Out</span>
                  <span className={styles.formulaValNegative}>−{currencySymbol}{formatNumber(cashOut)}</span>
                </div>
                <span className={styles.formulaOperator}>=</span>
                <div className={styles.formulaSegment}>
                  <span className={styles.formulaLabel}>In Drawer</span>
                  <span className={styles.formulaValResult}>{currencySymbol}{formatNumber(expectedTill)}</span>
                </div>
              </div>
            </section>

            {/* ── 3. SECONDARY FINANCIAL SUMMARY GRID ── */}
            <section className={styles.summaryGrid}>
              {/* Bank & POS Transfers */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <div className={styles.summaryIconWrap} data-variant="bank">
                    <Symbol name="account_balance" size={18} />
                  </div>
                  <span className={styles.summaryCardEyebrow}>ELECTRONIC INFLOWS</span>
                </div>
                <h3 className={styles.summaryCardAmount}>
                  {currencySymbol}{formatNumber(totalElectronicIn)}
                </h3>
                <div className={styles.summaryCardBreakdown}>
                  <span className={styles.breakdownChip}>
                    Transfer: <strong>{currencySymbol}{formatNumber(transferIn)}</strong>
                  </span>
                  <span className={styles.breakdownChip}>
                    POS: <strong>{currencySymbol}{formatNumber(posIn)}</strong>
                  </span>
                </div>
              </div>

              {/* Total Workshop Outflows */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <div className={styles.summaryIconWrap} data-variant="expense">
                    <Symbol name="receipt_long" size={18} />
                  </div>
                  <span className={styles.summaryCardEyebrow}>WORKSHOP EXPENSES</span>
                </div>
                <h3 className={`${styles.summaryCardAmount} ${styles.expenseAmount}`}>
                  {currencySymbol}{formatNumber(totalExpenses)}
                </h3>
                <div className={styles.summaryCardBreakdown}>
                  <span className={styles.breakdownChip}>
                    Cash Out: <strong>{currencySymbol}{formatNumber(cashOut)}</strong>
                  </span>
                  <span className={styles.breakdownChip}>
                    Bank Out: <strong>{currencySymbol}{formatNumber(transferOut)}</strong>
                  </span>
                </div>
              </div>
            </section>

            {/* ── 4. QUICK ACTION BAR: RECORD ATELIER EXPENSE ── */}
            <div className={styles.quickActionsBar}>
              <button
                type="button"
                className={styles.recordExpenseBtn}
                onClick={() => setExpenseModalOpen(true)}
              >
                <Symbol name="add" size={18} />
                <span>Record Workshop Expense</span>
              </button>
            </div>

            {/* ── 5. METHOD SEGMENTED FILTER ── */}
            <div className={styles.filterSection}>
              <div className={styles.segmentedControl} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'all'}
                  className={`${styles.segmentBtn} ${methodFilter === 'all' ? styles.segmentBtnActive : ''}`}
                  onClick={() => setMethodFilter('all')}
                >
                  All ({transactions.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'cash'}
                  className={`${styles.segmentBtn} ${methodFilter === 'cash' ? styles.segmentBtnActive : ''}`}
                  onClick={() => setMethodFilter('cash')}
                >
                  Cash ({transactions.filter((t) => t.method === 'cash').length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'transfer'}
                  className={`${styles.segmentBtn} ${methodFilter === 'transfer' ? styles.segmentBtnActive : ''}`}
                  onClick={() => setMethodFilter('transfer')}
                >
                  Transfer ({transactions.filter((t) => t.method === 'transfer').length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methodFilter === 'pos'}
                  className={`${styles.segmentBtn} ${methodFilter === 'pos' ? styles.segmentBtnActive : ''}`}
                  onClick={() => setMethodFilter('pos')}
                >
                  POS ({transactions.filter((t) => t.method === 'pos').length})
                </button>
              </div>
            </div>

            {/* ── 6. INSET GROUPED TRANSACTION LEDGER ── */}
            <section className={styles.ledgerSection}>
              <div className={styles.ledgerHeaderRow}>
                <h3 className={styles.ledgerSectionTitle}>
                  Daily Audit Ledger ({filteredTransactions.length})
                </h3>
                <span className={styles.ledgerMutedSummary}>
                  {filteredTransactions.filter((t) => t.type === 'income').length} in • {filteredTransactions.filter((t) => t.type === 'expense').length} out
                </span>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className={styles.emptyContainer}>
                  <EmptyState
                    icon={<Symbol name="account_balance_wallet" size={36} />}
                    title="No Transactions on this Date"
                    description={`No ${methodFilter === 'all' ? '' : methodFilter.toUpperCase() + ' '}receipts or workshop expenses recorded for ${displayDateText}.`}
                  />
                </div>
              ) : (
                <div className={styles.ledgerListCard}>
                  {filteredTransactions.map((t, idx) => (
                    <div
                      key={t.id}
                      className={styles.ledgerRow}
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
                          className={styles.craftBadge}
                          data-type={t.type}
                        >
                          <Symbol
                            name={t.type === 'income' ? 'south_west' : 'north_east'}
                            size={18}
                          />
                        </div>
                        <div className={styles.ledgerTextWrap}>
                          <span className={styles.ledgerDescTitle}>{t.desc}</span>
                          <div className={styles.ledgerMetaRow}>
                            <span className={styles.timeTag}>{t.time}</span>
                            <span className={styles.methodBadge} data-method={t.method}>
                              {t.method.toUpperCase()}
                            </span>
                            {t.category && (
                              <span className={styles.categoryBadge}>{t.category}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.ledgerRight}>
                        <span
                          className={styles.ledgerAmountNumeral}
                          data-type={t.type}
                        >
                          {t.type === 'income' ? '+' : '−'}
                          {currencySymbol}
                          {formatNumber(t.amount)}
                        </span>
                        {t.orderId && (
                          <Symbol name="chevron_right" size={16} className={styles.ledgerChevron} />
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

      {/* ── 7. QUICK RECORD EXPENSE BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Record Workshop Expense"
      >
        <form onSubmit={handleRecordExpense} className={styles.expenseForm}>
          <p className={styles.expenseModalIntro}>
            Record direct material purchases, generator fuel, or maintenance. This automatically updates your cash till and daily audit.
          </p>

          <div className={styles.field}>
            <label className={styles.capsLabel} htmlFor="expAmountInput">
              Amount Spent ({currencySymbol})
            </label>
            <input
              id="expAmountInput"
              type="text"
              inputMode="decimal"
              className={styles.amountInput}
              placeholder="e.g. 3,500"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.capsLabel}>Payment Method</label>
            <div className={styles.methodToggleRow}>
              <button
                type="button"
                className={`${styles.methodToggleBtn} ${expMethod === 'cash' ? styles.methodToggleBtnActive : ''}`}
                onClick={() => setExpMethod('cash')}
              >
                <Symbol name="payments" size={18} />
                <span>Cash from Drawer</span>
              </button>
              <button
                type="button"
                className={`${styles.methodToggleBtn} ${expMethod === 'transfer' ? styles.methodToggleBtnActive : ''}`}
                onClick={() => setExpMethod('transfer')}
              >
                <Symbol name="account_balance" size={18} />
                <span>Bank Transfer</span>
              </button>
            </div>
            <span className={styles.methodHint}>
              {expMethod === 'cash'
                ? 'Deducts directly from your expected physical cash in till.'
                : 'Recorded as an electronic bank disbursement.'}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.capsLabel} htmlFor="expCategorySelect">
              Expense Category
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="expCategorySelect"
                className={styles.selectInput}
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Symbol name="expand_more" size={18} className={styles.selectChevron} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.capsLabel} htmlFor="expDescInput">
              Note / Supplier (Optional)
            </label>
            <input
              id="expDescInput"
              type="text"
              className={styles.input}
              placeholder="e.g. 5 spools black thread + 4 YKK zips"
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
            />
          </div>

          <div className={styles.modalActionRow}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setExpenseModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitExpenseBtn}
              disabled={isSubmittingExpense || !expAmount.trim()}
            >
              {isSubmittingExpense ? (
                <span>Recording…</span>
              ) : (
                <>
                  <Symbol name="check" size={18} />
                  <span>Save Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </BottomSheet>
    </PageLayout>
  );
}
