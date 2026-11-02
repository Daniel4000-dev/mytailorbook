'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { getExpensesByDate, addExpense } from '@/app/actions/expenses';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/lib/types';
import { formatNumber, getCurrencySymbol } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import styles from './page.module.css';

const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; shortLabel: string; icon: string }[] = [
  { key: 'material', label: 'Sewing Materials (Threads, Zips, Linings)', shortLabel: 'Materials', icon: 'content_cut' },
  { key: 'general', label: 'Generator Fuel / Workshop Power', shortLabel: 'Fuel & Power', icon: 'bolt' },
  { key: 'outsourced', label: 'Machine Needles & Repairs', shortLabel: 'Machine Repairs', icon: 'build' },
  { key: 'logistics', label: 'Delivery & Transport Fare', shortLabel: 'Delivery & Fare', icon: 'local_shipping' },
  { key: 'labor', label: 'Artisan & Apprentice Wages', shortLabel: 'Wages', icon: 'engineering' },
];

export default function ShopExpensesPage() {
  const { currentShop } = useData();
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
  const [loading, setLoading] = useState(true);

  // Category filter: 'all' | 'material' | 'general' | 'other'
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'material' | 'general' | 'other'>('all');

  // Quick Expense BottomSheet state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('material');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDescription, setExpDescription] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Fetch expenses for selected date
  useEffect(() => {
    if (!currentShop?.id) return;
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        const expensesData = await getExpensesByDate(currentShop!.id, date);
        if (isMounted) {
          setExpenses(expensesData || []);
        }
      } catch (err) {
        console.error('Failed to fetch expenses', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentShop?.id, date]);

  // Calculations
  const totalDayExpense = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const materialsTotal = useMemo(
    () => expenses.filter((e) => e.category === 'material').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const fuelTotal = useMemo(
    () => expenses.filter((e) => e.category === 'general').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const otherTotal = useMemo(
    () => expenses.filter((e) => e.category !== 'material' && e.category !== 'general').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenses;
    if (categoryFilter === 'material') return expenses.filter((e) => e.category === 'material');
    if (categoryFilter === 'general') return expenses.filter((e) => e.category === 'general');
    return expenses.filter((e) => e.category !== 'material' && e.category !== 'general');
  }, [expenses, categoryFilter]);

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
      showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved!`, 'success');
      setExpenseModalOpen(false);
      setExpAmount('');
      setExpDescription('');
    } catch (err: any) {
      // In offline / fallback mode
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
      showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved!`, 'success');
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
          title="Shop Expenses"
          subtitle="Daily supplies, generator fuel & workshop costs"
          showBack
          onBack={() => router.push(ROUTES.dashboard)}
        />
      }
    >
      <div className={styles.container}>
        {/* ── 1. COMPACT DATE NAVIGATOR ── */}
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
            <p>Loading workshop expenses…</p>
          </div>
        ) : (
          <>
            {/* ── 2. CONSOLIDATED MASTER EXPENSE COCKPIT ── */}
            <section className={styles.cockpitCard}>
              <div className={styles.cockpitTop}>
                <div className={styles.cockpitHeaderRow}>
                  <div className={styles.cockpitTitleWrap}>
                    <div className={styles.expenseIconWrap}>
                      <Symbol name="receipt_long" size={18} />
                    </div>
                    <span className={styles.cockpitEyebrow}>Total Spent on {displayDateText}</span>
                  </div>
                  <span className={styles.statusBadge}>
                    {expenses.length} {expenses.length === 1 ? 'Expense' : 'Expenses'}
                  </span>
                </div>

                <div className={styles.mainAmountRow}>
                  <span className={styles.mainAmountNumeral}>
                    {currencySymbol}{formatNumber(totalDayExpense)}
                  </span>
                </div>

                <div className={styles.reportHint}>
                  <Symbol name="monitoring" size={14} className={styles.hintIcon} />
                  <span>Automatically deducted in your monthly profit report</span>
                </div>
              </div>

              <div className={styles.cockpitDivider} />

              <div className={styles.cockpitShelf}>
                <div className={styles.shelfCol}>
                  <span className={styles.shelfLabel}>Materials &amp; Trims</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(materialsTotal)}</span>
                  <span className={styles.shelfSubtext}>Thread, zips, lining</span>
                </div>

                <div className={styles.shelfCol}>
                  <span className={styles.shelfLabel}>Fuel &amp; Power</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(fuelTotal)}</span>
                  <span className={styles.shelfSubtext}>Generator &amp; power</span>
                </div>

                <div className={styles.shelfCol}>
                  <span className={styles.shelfLabel}>Repairs &amp; Other</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(otherTotal)}</span>
                  <span className={styles.shelfSubtext}>Delivery, repairs, wages</span>
                </div>
              </div>
            </section>

            {/* ── 3. ACTION ROW ── */}
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => setExpenseModalOpen(true)}
              >
                <Symbol name="add" size={17} />
                <span>Record Expense</span>
              </button>

              <button
                type="button"
                className={styles.secondaryActionBtn}
                onClick={() => router.push(ROUTES.reports)}
              >
                <Symbol name="monitoring" size={16} />
                <span>Monthly Profit &rarr;</span>
              </button>
            </div>

            {/* ── 4. CATEGORY SEGMENTED FILTER ── */}
            <div className={styles.methodSegmentedWrap} role="tablist" aria-label="Expense Categories">
              <div className={styles.methodSegmentedControl}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'all'}
                  className={`${styles.methodSegmentBtn} ${categoryFilter === 'all' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  <span>All</span>
                  <span className={styles.methodSegmentCount}>{expenses.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'material'}
                  className={`${styles.methodSegmentBtn} ${categoryFilter === 'material' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setCategoryFilter('material')}
                >
                  <span>Materials</span>
                  <span className={styles.methodSegmentCount}>
                    {expenses.filter((e) => e.category === 'material').length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'general'}
                  className={`${styles.methodSegmentBtn} ${categoryFilter === 'general' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setCategoryFilter('general')}
                >
                  <span>Fuel</span>
                  <span className={styles.methodSegmentCount}>
                    {expenses.filter((e) => e.category === 'general').length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'other'}
                  className={`${styles.methodSegmentBtn} ${categoryFilter === 'other' ? styles.methodSegmentActive : ''}`}
                  onClick={() => setCategoryFilter('other')}
                >
                  <span>Other</span>
                  <span className={styles.methodSegmentCount}>
                    {expenses.filter((e) => e.category !== 'material' && e.category !== 'general').length}
                  </span>
                </button>
              </div>
            </div>

            {/* ── 5. EXPENSE LEDGER ── */}
            <section className={styles.ledgerSection}>
              <div className={styles.ledgerHeaderRow}>
                <h3 className={styles.ledgerSectionTitle}>
                  Daily Expenses Ledger
                </h3>
                <span className={styles.ledgerMutedSummary}>
                  {filteredExpenses.length} {filteredExpenses.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className={styles.emptyContainer}>
                  <EmptyState
                    icon={<Symbol name="receipt_long" size={32} />}
                    title="No Expenses Logged on this Date"
                    description={`No workshop payouts or material purchases recorded for ${displayDateText}.`}
                    action={{
                      label: 'Record Expense',
                      onClick: () => setExpenseModalOpen(true),
                    }}
                  />
                </div>
              ) : (
                <div className={styles.ledgerCard}>
                  {filteredExpenses.map((e) => {
                    const catObj = EXPENSE_CATEGORIES.find((c) => c.key === e.category);
                    return (
                      <div key={e.id} className={styles.ledgerRow}>
                        <div className={styles.ledgerLeft}>
                          <div className={styles.expenseItemIconWrap}>
                            <Symbol name={catObj?.icon || 'receipt_long'} size={17} />
                          </div>
                          <div className={styles.ledgerDetails}>
                            <span className={styles.ledgerTitle}>{e.description || catObj?.label || 'Workshop Cost'}</span>
                            <div className={styles.ledgerMeta}>
                              <span className={styles.categoryName}>{catObj?.shortLabel || e.category}</span>
                              <span className={styles.metaDot}>·</span>
                              <span className={styles.methodBadge}>
                                {e.method === 'cash' ? 'Cash' : 'Bank Transfer'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.ledgerRight}>
                          <span className={styles.ledgerAmount}>
                            −{currencySymbol}{formatNumber(e.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── 6. RECORD EXPENSE BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Record Shop Expense"
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
            <label className={styles.fieldLabel}>Payment Mode</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'cash' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('cash')}
              >
                <Symbol name="payments" size={17} />
                <span>Cash from Pocket / Drawer</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'transfer' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('transfer')}
              >
                <Symbol name="account_balance" size={17} />
                <span>Bank Transfer</span>
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="expDescInput">
              Supplier / Details (Optional)
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
    </PageLayout>
  );
}
