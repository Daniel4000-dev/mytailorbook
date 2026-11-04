'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { getExpensesByDate, addExpense, deleteExpense, updateExpense } from '@/app/actions/expenses';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/lib/types';
import { formatNumber, getCurrencySymbol } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import styles from './page.module.css';

export const EXPENSE_CATEGORIES: {
  key: ExpenseCategory;
  label: string;
  shortLabel: string;
  icon: string;
}[] = [
  { key: 'material', label: 'Sewing Materials (Threads, Zips, Linings)', shortLabel: 'Materials', icon: 'content_cut' },
  { key: 'general', label: 'Generator Fuel / Workshop Power', shortLabel: 'Fuel & Power', icon: 'bolt' },
  { key: 'labor', label: 'Artisan & Machinist Sewing Wages', shortLabel: 'Artisan Wages', icon: 'engineering' },
  { key: 'outsourced', label: 'Machine Needles & Technician Repairs', shortLabel: 'Machine Repairs', icon: 'build' },
  { key: 'logistics', label: 'Delivery Courier & Transport Fare', shortLabel: 'Delivery Fare', icon: 'local_shipping' },
];

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

const WORKSHOP_PRESETS: {
  label: string;
  amount: string;
  category: ExpenseCategory;
  description: string;
}[] = [
  { label: 'Fuel (₦5,000)', amount: '5000', category: 'general', description: 'Generator Fuel' },
  { label: 'Fuel (₦10,000)', amount: '10000', category: 'general', description: 'Generator Fuel' },
  { label: 'Threads & Zips', amount: '3000', category: 'material', description: 'Market spools and zips' },
  { label: 'Delivery Fare', amount: '2000', category: 'logistics', description: 'Dispatch rider delivery' },
  { label: 'Artisan Payout', amount: '', category: 'labor', description: 'Machinist sewing fee' },
];

export default function ShopExpensesPage() {
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
  const [loading, setLoading] = useState(true);

  // Category filter: 'all' | ExpenseCategory
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');

  // Quick Expense BottomSheet state (Create or Edit)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expDate, setExpDate] = useState<string>(date);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('material');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDescription, setExpDescription] = useState('');
  const [expOrderId, setExpOrderId] = useState<string>('');
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

  // Cash vs Transfer Breakdown (Crucial for Drawer Reconciliation)
  const cashTotal = useMemo(
    () => expenses.filter((e) => (e.method || 'cash') === 'cash').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const transferTotal = useMemo(
    () => expenses.filter((e) => e.method === 'transfer').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // Category Totals
  const materialsTotal = useMemo(
    () => expenses.filter((e) => e.category === 'material').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const fuelTotal = useMemo(
    () => expenses.filter((e) => e.category === 'general').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const wagesTotal = useMemo(
    () => expenses.filter((e) => e.category === 'labor').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const repairsTotal = useMemo(
    () => expenses.filter((e) => e.category === 'outsourced').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const deliveryTotal = useMemo(
    () => expenses.filter((e) => e.category === 'logistics').reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // Sorted active orders for job-costing dropdown
  const activeOrdersList = useMemo(() => {
    if (!orders) return [];
    const inProgress = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
    const others = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
    return [...inProgress, ...others].slice(0, 50);
  }, [orders]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
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

  // Open Create Modal
  const handleOpenCreateModal = (preset?: {
    amount?: string;
    category?: ExpenseCategory;
    description?: string;
  }) => {
    setEditingExpenseId(null);
    setExpDate(date);
    setExpAmount(preset?.amount || '');
    setExpCategory(preset?.category || (categoryFilter !== 'all' ? categoryFilter : 'material'));
    setExpMethod('cash');
    setExpDescription(preset?.description || '');
    setExpOrderId('');
    setExpenseModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpDate(expense.date || date);
    setExpAmount(expense.amount.toString());
    setExpCategory(expense.category);
    setExpMethod(expense.method || 'cash');
    setExpDescription(expense.description || '');
    setExpOrderId(expense.orderId || '');
    setExpenseModalOpen(true);
  };

  // Quick Amount Add
  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(expAmount.replace(/[^0-9.]/g, '')) || 0;
    setExpAmount((current + val).toString());
  };

  // Delete Expense with Instant 6-Second Undo
  const handleDeleteExpense = async (id: string) => {
    const expenseToDelete = expenses.find((e) => e.id === id);
    if (!expenseToDelete) return;

    // Optimistically remove from state
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);

    let undone = false;
    showToast(
      `Expense of ${currencySymbol}${formatNumber(expenseToDelete.amount)} removed`,
      'info',
      {
        label: 'Undo',
        onClick: async () => {
          undone = true;
          setExpenses([expenseToDelete, ...updated]);
          showToast('Expense restored', 'success');
        },
      }
    );

    // Call server after undo window
    setTimeout(async () => {
      if (!undone && currentShop?.id) {
        try {
          await deleteExpense(id, currentShop.id);
        } catch (err) {
          console.error('Failed to delete expense from server', err);
        }
      }
    }, 6200);
  };

  // Handle Quick Expense Submission (Create or Edit)
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(expAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }

    if (!currentShop?.id) return;
    setIsSubmittingExpense(true);

    const desc = expDescription.trim() || EXPENSE_CATEGORIES.find((c) => c.key === expCategory)?.shortLabel || 'Workshop Expense';
    const targetDate = expDate || date;

    try {
      if (editingExpenseId) {
        // Edit existing
        await updateExpense(editingExpenseId, currentShop.id, {
          amount: numAmount,
          category: expCategory,
          description: desc,
          date: targetDate,
          method: expMethod,
          orderId: expOrderId || null,
        });

        if (targetDate === date) {
          setExpenses((prev) =>
            prev.map((item) =>
              item.id === editingExpenseId
                ? {
                    ...item,
                    amount: numAmount,
                    category: expCategory,
                    description: desc,
                    date: targetDate,
                    method: expMethod,
                    orderId: expOrderId || undefined,
                  }
                : item
            )
          );
          showToast(`Expense updated!`, 'success');
        } else {
          setExpenses((prev) => prev.filter((item) => item.id !== editingExpenseId));
          showToast(`Expense updated and moved to ${targetDate}`, 'success', {
            label: 'View Date',
            onClick: () => setDate(targetDate),
          });
        }
      } else {
        // Create new
        const newExp = await addExpense({
          shopId: currentShop.id,
          amount: numAmount,
          category: expCategory,
          description: desc,
          date: targetDate,
          method: expMethod,
          orderId: expOrderId || undefined,
        });

        if (targetDate === date) {
          setExpenses((prev) => [newExp as Expense, ...prev]);
          showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved!`, 'success');
        } else {
          showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved for ${targetDate}`, 'success', {
            label: 'View Date',
            onClick: () => setDate(targetDate),
          });
        }
      }

      setExpenseModalOpen(false);
      setExpAmount('');
      setExpDescription('');
      setEditingExpenseId(null);
    } catch (err: any) {
      // In offline / fallback mode
      if (editingExpenseId) {
        if (targetDate === date) {
          setExpenses((prev) =>
            prev.map((item) =>
              item.id === editingExpenseId
                ? {
                    ...item,
                    amount: numAmount,
                    category: expCategory,
                    description: desc,
                    date: targetDate,
                    method: expMethod,
                    orderId: expOrderId || undefined,
                  }
                : item
            )
          );
          showToast(`Expense updated!`, 'success');
        } else {
          setExpenses((prev) => prev.filter((item) => item.id !== editingExpenseId));
          showToast(`Expense moved to ${targetDate}`, 'success', {
            label: 'View Date',
            onClick: () => setDate(targetDate),
          });
        }
      } else {
        const mockExp: Expense = {
          id: `mock-exp-${Date.now()}`,
          shopId: currentShop.id,
          amount: numAmount,
          category: expCategory,
          description: desc,
          date: targetDate,
          method: expMethod,
          orderId: expOrderId || undefined,
          createdAt: new Date().toISOString(),
        };
        if (targetDate === date) {
          setExpenses((prev) => [mockExp, ...prev]);
          showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved!`, 'success');
        } else {
          showToast(`Expense saved for ${targetDate}`, 'success', {
            label: 'View Date',
            onClick: () => setDate(targetDate),
          });
        }
      }
      setExpenseModalOpen(false);
      setExpAmount('');
      setExpDescription('');
      setEditingExpenseId(null);
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

                {/* ── Physical Cash vs Bank Transfer Meter ── */}
                <div className={styles.reconciliationSplitCard}>
                  <div className={styles.splitSegment}>
                    <div className={styles.splitIconCash}>
                      <Symbol name="payments" size={15} />
                    </div>
                    <div className={styles.splitTextWrap}>
                      <span className={styles.splitLabel}>Cash from Drawer</span>
                      <span className={styles.splitValue}>
                        {currencySymbol}{formatNumber(cashTotal)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.splitDivider} />

                  <div className={styles.splitSegment}>
                    <div className={styles.splitIconTransfer}>
                      <Symbol name="account_balance" size={15} />
                    </div>
                    <div className={styles.splitTextWrap}>
                      <span className={styles.splitLabel}>Bank Transfer</span>
                      <span className={styles.splitValue}>
                        {currencySymbol}{formatNumber(transferTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.reportHint}>
                  <Symbol name="monitoring" size={14} className={styles.hintIcon} />
                  <span>Deducted automatically from your monthly profit report</span>
                </div>
              </div>

              <div className={styles.cockpitDivider} />

              {/* ── Category Breakdown Shelf (All 5 Tailor Categories) ── */}
              <div className={styles.cockpitShelf}>
                <button
                  type="button"
                  className={`${styles.shelfColBtn} ${categoryFilter === 'material' ? styles.shelfActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'material' ? 'all' : 'material')}
                >
                  <span className={styles.shelfLabel}>Materials</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(materialsTotal)}</span>
                  <span className={styles.shelfSubtext}>Thread, zips, lining</span>
                </button>

                <button
                  type="button"
                  className={`${styles.shelfColBtn} ${categoryFilter === 'general' ? styles.shelfActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'general' ? 'all' : 'general')}
                >
                  <span className={styles.shelfLabel}>Fuel &amp; Power</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(fuelTotal)}</span>
                  <span className={styles.shelfSubtext}>Generator &amp; power</span>
                </button>

                <button
                  type="button"
                  className={`${styles.shelfColBtn} ${categoryFilter === 'labor' ? styles.shelfActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'labor' ? 'all' : 'labor')}
                >
                  <span className={styles.shelfLabel}>Artisan Wages</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(wagesTotal)}</span>
                  <span className={styles.shelfSubtext}>Machinist fees</span>
                </button>

                <button
                  type="button"
                  className={`${styles.shelfColBtn} ${categoryFilter === 'outsourced' ? styles.shelfActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'outsourced' ? 'all' : 'outsourced')}
                >
                  <span className={styles.shelfLabel}>Repairs</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(repairsTotal)}</span>
                  <span className={styles.shelfSubtext}>Needles &amp; service</span>
                </button>

                <button
                  type="button"
                  className={`${styles.shelfColBtn} ${categoryFilter === 'logistics' ? styles.shelfActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'logistics' ? 'all' : 'logistics')}
                >
                  <span className={styles.shelfLabel}>Delivery</span>
                  <span className={styles.shelfValue}>{currencySymbol}{formatNumber(deliveryTotal)}</span>
                  <span className={styles.shelfSubtext}>Dispatch fares</span>
                </button>
              </div>
            </section>

            {/* ── 3. ACTION ROW & WORKSHOP QUICK PRESETS ── */}
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => handleOpenCreateModal()}
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

            {/* ── 1-Tap Workshop Quick Presets Bar ── */}
            <div className={styles.presetScrollWrap}>
              <span className={styles.presetLabel}>1-Tap Log:</span>
              {WORKSHOP_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.presetChip}
                  onClick={() =>
                    handleOpenCreateModal({
                      amount: p.amount,
                      category: p.category,
                      description: p.description,
                    })
                  }
                >
                  {p.label}
                </button>
              ))}
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
                {EXPENSE_CATEGORIES.map((cat) => {
                  const count = expenses.filter((e) => e.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      role="tab"
                      aria-selected={categoryFilter === cat.key}
                      className={`${styles.methodSegmentBtn} ${categoryFilter === cat.key ? styles.methodSegmentActive : ''}`}
                      onClick={() => setCategoryFilter(cat.key)}
                    >
                      <span>{cat.shortLabel}</span>
                      <span className={styles.methodSegmentCount}>{count}</span>
                    </button>
                  );
                })}
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
                    title={
                      categoryFilter !== 'all' && expenses.length > 0
                        ? `No ${EXPENSE_CATEGORIES.find((c) => c.key === categoryFilter)?.shortLabel || ''} Expenses`
                        : "No Expenses Logged on this Date"
                    }
                    description={
                      categoryFilter !== 'all' && expenses.length > 0
                        ? `No ${EXPENSE_CATEGORIES.find((c) => c.key === categoryFilter)?.shortLabel.toLowerCase() || ''} expenses found for ${displayDateText}.`
                        : `No workshop payouts or material purchases recorded for ${displayDateText}.`
                    }
                    action={{
                      label: categoryFilter !== 'all' && expenses.length > 0 ? 'Show All Expenses' : 'Record Expense',
                      onClick: categoryFilter !== 'all' && expenses.length > 0 ? () => setCategoryFilter('all') : () => handleOpenCreateModal(),
                    }}
                  />
                </div>
              ) : (
                <div className={styles.ledgerCard}>
                  {filteredExpenses.map((e) => {
                    const catObj = EXPENSE_CATEGORIES.find((c) => c.key === e.category);
                    const linkedOrder = e.orderId ? orders?.find((o) => o.id === e.orderId) : null;

                    return (
                      <div key={e.id} className={styles.ledgerRow}>
                        <div className={styles.ledgerLeft}>
                          <div className={`${styles.expenseItemIconWrap} ${styles['icon_' + e.category] || ''}`}>
                            <Symbol name={catObj?.icon || 'receipt_long'} size={17} />
                          </div>
                          <div className={styles.ledgerDetails}>
                            <span className={styles.ledgerTitle}>
                              {e.description || catObj?.label || 'Workshop Cost'}
                            </span>
                            <div className={styles.ledgerMeta}>
                              <span className={`${styles.categoryBadge} ${styles['badge_' + e.category] || ''}`}>
                                {catObj?.shortLabel || e.category}
                              </span>
                              <span className={styles.metaDot}>·</span>
                              <span className={styles.methodBadge}>
                                {e.method === 'transfer' ? 'Bank Transfer' : 'Cash'}
                              </span>
                              {linkedOrder && (
                                <>
                                  <span className={styles.metaDot}>·</span>
                                  <span className={styles.orderBadge}>
                                    Order #{linkedOrder.orderNumber || linkedOrder.id.slice(0, 4)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.ledgerRight}>
                          <span className={styles.ledgerAmount}>
                            −{currencySymbol}{formatNumber(e.amount)}
                          </span>

                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.rowActionBtn}
                              onClick={() => handleOpenEditModal(e)}
                              aria-label="Edit expense"
                              title="Edit expense"
                            >
                              <Symbol name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.rowActionBtn} ${styles.deleteActionBtn}`}
                              onClick={() => handleDeleteExpense(e.id)}
                              aria-label="Delete expense"
                              title="Delete expense"
                            >
                              <Symbol name="delete" size={15} />
                            </button>
                          </div>
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

      {/* ── 6. RECORD / EDIT EXPENSE BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpenseId(null);
        }}
        title={editingExpenseId ? 'Edit Shop Expense' : 'Record Shop Expense'}
      >
        <form onSubmit={handleRecordExpense} className={styles.modalForm}>
          {/* Amount Field with 1-Tap Quick Pills */}
          <div className={styles.field}>
            <div className={styles.amountHeaderRow}>
              <label className={styles.fieldLabel} htmlFor="expAmountInput">
                Amount Spent ({currencySymbol})
              </label>
              <div className={styles.quickAmountPills}>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={styles.quickAmountBtn}
                    onClick={() => handleAddQuickAmount(amt)}
                  >
                    +{formatNumber(amt)}
                  </button>
                ))}
                {expAmount && (
                  <button
                    type="button"
                    className={styles.clearAmountBtn}
                    onClick={() => setExpAmount('')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

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

          {/* Expense Category */}
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

          {/* Payment Mode (Cash vs Bank Transfer) */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Payment Source</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'cash' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('cash')}
              >
                <Symbol name="payments" size={17} />
                <span>Cash from Drawer</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'transfer' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('transfer')}
              >
                <Symbol name="account_balance" size={17} />
                <span>Bank Transfer / POS</span>
              </button>
            </div>
          </div>

          {/* Expense Date */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="expDateField">
              Expense Date
            </label>
            <input
              id="expDateField"
              type="date"
              className={styles.textInput}
              value={expDate}
              max={todayStr}
              onChange={(e) => e.target.value && setExpDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="expDescInput">
              Item Details / Supplier Note (Optional)
            </label>
            <input
              id="expDescInput"
              type="text"
              className={styles.textInput}
              placeholder="e.g. 5 spools navy thread + 4 YKK zips"
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
            />
          </div>

          {/* Optional Order Attribution */}
          {activeOrdersList.length > 0 && (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="expOrderSelect">
                Link to Customer Order (Optional Job Costing)
              </label>
              <select
                id="expOrderSelect"
                className={styles.selectInput}
                value={expOrderId}
                onChange={(e) => setExpOrderId(e.target.value)}
              >
                <option value="">None (General Workshop Overhead)</option>
                {activeOrdersList.map((o) => (
                  <option key={o.id} value={o.id}>
                    Order #{o.orderNumber || o.id.slice(0, 4)} — {o.customerName || 'Customer'} ({o.styleName || 'Custom Outfit'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Modal Actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => {
                setExpenseModalOpen(false);
                setEditingExpenseId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.modalSubmitBtn}
              disabled={isSubmittingExpense || !expAmount.trim()}
            >
              {isSubmittingExpense
                ? 'Saving…'
                : editingExpenseId
                ? 'Save Changes'
                : 'Save Expense'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </PageLayout>
  );
}