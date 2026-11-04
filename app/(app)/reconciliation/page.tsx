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

const EXPENSE_CATEGORIES: {
  key: ExpenseCategory;
  label: string;
  shortLabel: string;
  icon: string;
}[] = [
  { key: 'material', label: 'Sewing Materials (Threads, Zips, Linings)', shortLabel: 'Materials', icon: 'content_cut' },
  { key: 'general', label: 'Generator Fuel & Workshop Power', shortLabel: 'Fuel & Power', icon: 'bolt' },
  { key: 'labor', label: 'Staff & Tailor Wages (Daily / Weekly Pay)', shortLabel: 'Staff Wages', icon: 'payments' },
  { key: 'outsourced', label: 'Machine Needles & Technician Repairs', shortLabel: 'Repairs', icon: 'build' },
  { key: 'logistics', label: 'Delivery Courier & Transport Fare', shortLabel: 'Delivery', icon: 'local_shipping' },
];

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  // Selected date (Local YYYY-MM-DD)
  const [date, setDate] = useState<string>(() => getLocalDateString());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Safe pending deletions tracker across unmounts
  const pendingDeletionsRef = React.useRef<Map<string, { timer: NodeJS.Timeout; undone: boolean }>>(new Map());

  useEffect(() => {
    return () => {
      pendingDeletionsRef.current.forEach((item, id) => {
        clearTimeout(item.timer);
        if (!item.undone && currentShop?.id) {
          deleteExpense(id, currentShop.id).catch(console.error);
        }
      });
      pendingDeletionsRef.current.clear();
    };
  }, [currentShop?.id]);

  // Fetch expenses for selected date
  useEffect(() => {
    if (!currentShop?.id) return;
    let isMounted = true;

    async function fetchData() {
      if (!initialLoading) {
        setIsRefreshing(true);
      }
      try {
        const expensesData = await getExpensesByDate(currentShop!.id, date);
        if (isMounted) {
          setExpenses(expensesData || []);
        }
      } catch (err) {
        console.error('Failed to fetch expenses', err);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentShop?.id, date, initialLoading]);

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

  // Dynamic localized quick amounts
  const quickAmounts = useMemo(() => {
    const curr = (currentShop?.currency || 'NGN').toUpperCase();
    if (['USD', 'EUR', 'GBP'].includes(curr)) {
      return [5, 10, 20, 50];
    }
    return [1000, 2000, 5000, 10000];
  }, [currentShop?.currency]);

  // Dynamic localized presets using workshop currency
  const workshopPresets = useMemo(() => {
    const curr = (currentShop?.currency || 'NGN').toUpperCase();
    const isWestern = ['USD', 'EUR', 'GBP'].includes(curr);
    return [
      {
        label: `Fuel (${currencySymbol}${formatNumber(isWestern ? 20 : 5000)})`,
        amount: isWestern ? '20' : '5000',
        category: 'general' as ExpenseCategory,
        description: 'Generator Fuel',
        method: 'cash' as PaymentMethod,
      },
      {
        label: 'Threads & Zips',
        amount: isWestern ? '15' : '3000',
        category: 'material' as ExpenseCategory,
        description: 'Sewing threads & zips',
        method: 'cash' as PaymentMethod,
      },
      {
        label: 'Staff Pay',
        amount: '',
        category: 'labor' as ExpenseCategory,
        description: 'Tailor wage',
        method: 'transfer' as PaymentMethod,
      },
      {
        label: 'Delivery Fare',
        amount: isWestern ? '10' : '2000',
        category: 'logistics' as ExpenseCategory,
        description: 'Delivery dispatch fare',
        method: 'cash' as PaymentMethod,
      },
    ];
  }, [currencySymbol, currentShop?.currency]);

  // Sorted active orders for job-costing dropdown
  const selectableOrders = useMemo(() => {
    if (!orders) return [];
    const inProgress = orders.filter((o) => o.status !== 'Delivered');
    const others = orders.filter((o) => o.status === 'Delivered');
    const list = [...inProgress, ...others].slice(0, 50);
    if (expOrderId && !list.some((o) => o.id === expOrderId)) {
      const match = orders.find((o) => o.id === expOrderId);
      if (match) list.unshift(match);
    }
    return list;
  }, [orders, expOrderId]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  // Date Navigator Helpers
  const todayStr = useMemo(() => getLocalDateString(), []);
  const yesterdayStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateString(y);
  }, []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return getLocalDateString(t);
  }, []);

  const changeDate = (days: number) => {
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + days);
    setDate(getLocalDateString(dateObj));
  };

  const isToday = date === todayStr;
  const isYesterday = date === yesterdayStr;
  const isTomorrow = date === tomorrowStr;

  const displayDateText = useMemo(() => {
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    if (isTomorrow) return 'Tomorrow';
    const [y, m, d] = date.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [date, isToday, isYesterday, isTomorrow]);

  // Open Create Modal
  const handleOpenCreateModal = (preset?: {
    amount?: string;
    category?: ExpenseCategory;
    description?: string;
    method?: PaymentMethod;
  }) => {
    setEditingExpenseId(null);
    setExpDate(date);
    setExpAmount(preset?.amount || '');
    setExpCategory(preset?.category || (categoryFilter !== 'all' ? categoryFilter : 'material'));
    setExpMethod(preset?.method || 'cash');
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

  // Real-time input sanitizer: numbers and max 1 decimal point
  const handleAmountChange = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const sanitized = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
    setExpAmount(sanitized);
  };

  // 1-Tap Copy WhatsApp Daily Reconciliation Summary
  const handleShareSummary = () => {
    const lines = [
      `Shop Expenses — ${displayDateText} (${date})`,
      `Total Spent: ${currencySymbol}${formatNumber(totalDayExpense)}`,
      `• Cash from Drawer: ${currencySymbol}${formatNumber(cashTotal)}`,
      `• Bank Transfer / POS: ${currencySymbol}${formatNumber(transferTotal)}`,
      ``,
      `Category Breakdown:`,
      `• Materials: ${currencySymbol}${formatNumber(materialsTotal)}`,
      `• Fuel & Power: ${currencySymbol}${formatNumber(fuelTotal)}`,
      `• Staff Wages: ${currencySymbol}${formatNumber(wagesTotal)}`,
      `• Repairs: ${currencySymbol}${formatNumber(repairsTotal)}`,
      `• Delivery: ${currencySymbol}${formatNumber(deliveryTotal)}`,
      ``,
      `Entries (${expenses.length}):`,
      ...expenses.map(
        (e) =>
          `• ${e.description || 'Cost'}: ${currencySymbol}${formatNumber(e.amount)} (${e.method === 'transfer' ? 'Transfer' : 'Cash'})`
      ),
      ``,
      `Logged with MyTailorBook`,
    ];

    const text = lines.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Daily summary copied! Ready to paste into WhatsApp', 'success');
    } else {
      showToast('Could not access clipboard', 'error');
    }
  };

  // Quick Amount Add
  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(expAmount.replace(/[^0-9.]/g, '')) || 0;
    setExpAmount((current + val).toString());
  };

  // Delete Expense with Instant 6-Second Undo
  const handleDeleteExpense = async (id: string) => {
    const deletedIndex = expenses.findIndex((e) => e.id === id);
    const expenseToDelete = expenses[deletedIndex];
    if (!expenseToDelete) return;

    // Optimistically remove from state
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);

    const pendingItem = { timer: null as any, undone: false };

    showToast(
      `Expense of ${currencySymbol}${formatNumber(expenseToDelete.amount)} removed`,
      'info',
      {
        label: 'Undo',
        onClick: async () => {
          pendingItem.undone = true;
          if (pendingItem.timer) clearTimeout(pendingItem.timer);
          pendingDeletionsRef.current.delete(id);
          setExpenses((prev) => {
            const copy = [...prev];
            copy.splice(deletedIndex >= 0 ? deletedIndex : 0, 0, expenseToDelete);
            return copy;
          });
          showToast('Expense restored', 'success');
        },
      }
    );

    pendingItem.timer = setTimeout(async () => {
      if (!pendingItem.undone && currentShop?.id) {
        pendingDeletionsRef.current.delete(id);
        try {
          await deleteExpense(id, currentShop.id);
        } catch (err) {
          console.error('Failed to delete expense from server', err);
          setExpenses((prev) => {
            const copy = [...prev];
            copy.splice(deletedIndex >= 0 ? deletedIndex : 0, 0, expenseToDelete);
            return copy;
          });
          showToast('Could not delete expense from server. Restored.', 'error');
        }
      }
    }, 6200);

    pendingDeletionsRef.current.set(id, pendingItem);
  };

  // Handle Quick Expense Submission
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
    const editId = editingExpenseId;
    const previousExpense = editId ? expenses.find((item) => item.id === editId) : null;
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

    const optimisticExp: Expense = {
      id: editId || tempId,
      shopId: currentShop.id,
      amount: numAmount,
      category: expCategory,
      description: desc,
      date: targetDate,
      method: expMethod,
      orderId: expOrderId || undefined,
      createdAt: new Date().toISOString(),
    };

    setExpenseModalOpen(false);
    setExpAmount('');
    setExpDescription('');
    setEditingExpenseId(null);

    if (editId) {
      if (targetDate === date) {
        setExpenses((prev) => prev.map((item) => (item.id === editId ? optimisticExp : item)));
        showToast('Expense updated!', 'success');
      } else {
        setExpenses((prev) => prev.filter((item) => item.id !== editId));
        showToast(`Expense updated and moved to ${targetDate}`, 'success', {
          label: 'View Date',
          onClick: () => setDate(targetDate),
        });
      }
    } else {
      if (targetDate === date) {
        setExpenses((prev) => [optimisticExp, ...prev]);
        showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved!`, 'success');
      } else {
        showToast(`Expense of ${currencySymbol}${formatNumber(numAmount)} saved for ${targetDate}`, 'success', {
          label: 'View Date',
          onClick: () => setDate(targetDate),
        });
      }
    }

    try {
      if (editId) {
        await updateExpense(editId, currentShop.id, {
          amount: numAmount,
          category: expCategory,
          description: desc,
          date: targetDate,
          method: expMethod,
          orderId: expOrderId || undefined,
        });
      } else {
        const savedExp = await addExpense({
          shopId: currentShop.id,
          amount: numAmount,
          category: expCategory,
          description: desc,
          date: targetDate,
          method: expMethod,
          orderId: expOrderId || undefined,
        });
        setExpenses((prev) => prev.map((item) => (item.id === tempId ? (savedExp as Expense) : item)));
      }
    } catch (err: any) {
      console.warn('Expense sync error', err);
      if (editId && previousExpense) {
        setExpenses((prev) => prev.map((item) => (item.id === editId ? previousExpense : item)));
      } else if (!editId) {
        setExpenses((prev) => prev.filter((item) => item.id !== tempId));
      }
      showToast('Could not save expense to server. Please check your connection.', 'error');
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
          rightAction={
            <button
              type="button"
              className={styles.headerReportsBtn}
              onClick={() => router.push(ROUTES.reports)}
              title="View Monthly Profit & Loss Reports"
            >
              <Symbol name="monitoring" size={15} />
              <span>Reports</span>
            </button>
          }
        />
      }
    >
      <div className={styles.container}>
        {/* ── 1. CLEAN DATE STRIP ── */}
        <section className={styles.dateBar}>
            <div className={styles.dateBarCenter}>
              <button
                type="button"
                className={styles.chevronBtn}
                onClick={() => changeDate(-1)}
                aria-label="Previous day"
              >
                <Symbol name="chevron_left" size={18} />
              </button>

              <label className={styles.calendarPickerBtn} htmlFor="reconDateInput">
                <Symbol name="calendar_today" size={13} />
                <span className={styles.displayDateLabel}>{displayDateText}</span>
                <span className={styles.displayDateSub}>({date})</span>
                <input
                  id="reconDateInput"
                  type="date"
                  className={styles.hiddenDateInput}
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
              </label>

              <button
                type="button"
                className={styles.chevronBtn}
                onClick={() => changeDate(1)}
                aria-label="Next day"
              >
                <Symbol name="chevron_right" size={18} />
              </button>
            </div>

            <div className={styles.dateBarRight}>
              {!isToday && (
                <button
                  type="button"
                  className={styles.todayJumpBtn}
                  onClick={() => setDate(todayStr)}
                >
                  Today
                </button>
              )}

              {expenses.length > 0 && (
                <button
                  type="button"
                  className={styles.shareSummaryBtn}
                  onClick={handleShareSummary}
                  title="Copy WhatsApp-ready reconciliation summary"
                  aria-label="Share summary on WhatsApp"
                >
                  <Symbol name="share" size={13} />
                  <span>Share</span>
                </button>
              )}
            </div>
        </section>

        {initialLoading ? (
          <div className={styles.loadingState}>
            <Symbol name="progress_activity" size={28} className="global-spinner" />
            <p>Loading shop expenses…</p>
          </div>
        ) : (
          <>
            {/* ── 2. ELEVATED FINANCIAL HERO CARD ── */}
            <section className={styles.summaryDeck}>
              <div className={styles.summaryDeckHeader}>
                <span className={styles.summaryEyebrow}>
                  Total Expenses · {displayDateText}
                </span>
                {isRefreshing && (
                  <span className={styles.refreshPulse} title="Syncing...">
                    <Symbol name="progress_activity" size={12} className="global-spinner" />
                  </span>
                )}
              </div>

              <div className={styles.mainAmountRow}>
                <span className={styles.mainAmountNumeral}>
                  {currencySymbol}{formatNumber(totalDayExpense)}
                </span>
                <span className={styles.countBadge}>
                  {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {/* Drawer Balance Breakdown */}
              <div className={styles.drawerSplitStrip}>
                <div className={styles.drawerSegment}>
                  <span className={styles.dotCash} />
                  <div className={styles.drawerTextCol}>
                    <span className={styles.drawerLabel}>Cash in Drawer</span>
                    <strong className={styles.drawerValue}>
                      {currencySymbol}{formatNumber(cashTotal)}
                    </strong>
                  </div>
                </div>

                <div className={styles.drawerSplitDivider} />

                <div className={styles.drawerSegment}>
                  <span className={styles.dotTransfer} />
                  <div className={styles.drawerTextCol}>
                    <span className={styles.drawerLabel}>Bank Transfer / POS</span>
                    <strong className={styles.drawerValue}>
                      {currencySymbol}{formatNumber(transferTotal)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 3. PRIMARY ACTION ── */}
            <div className={styles.actionSection}>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => handleOpenCreateModal()}
              >
                <Symbol name="add" size={18} />
                <span>Record Expense</span>
              </button>
            </div>

            {/* ── 4. CATEGORY FILTER (Decluttered — only shown when entries exist) ── */}
            {expenses.length > 0 && (
              <div className={styles.filterBarWrapper} role="tablist" aria-label="Filter expenses by category">
                <div className={styles.filterBar}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === 'all'}
                    className={`${styles.filterPill} ${categoryFilter === 'all' ? styles.filterPillActive : ''}`}
                    onClick={() => setCategoryFilter('all')}
                  >
                    <span>All</span>
                    <span className={styles.filterCount}>{expenses.length}</span>
                  </button>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const count = expenses.filter((e) => e.category === cat.key).length;
                    const isActive = categoryFilter === cat.key;
                    if (count === 0 && categoryFilter !== cat.key) return null;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''}`}
                        onClick={() => setCategoryFilter(isActive ? 'all' : cat.key)}
                      >
                        <Symbol name={cat.icon} size={13} />
                        <span>{cat.shortLabel}</span>
                        {count > 0 && <span className={styles.filterCount}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 5. CLEAN LEDGER SECTION ── */}
            <section className={styles.ledgerSection}>
              {filteredExpenses.length === 0 ? (
                <div className={styles.emptyContainer}>
                  <EmptyState
                    icon={<Symbol name="receipt_long" size={32} />}
                    title={
                      categoryFilter !== 'all' && expenses.length > 0
                        ? `No ${EXPENSE_CATEGORIES.find((c) => c.key === categoryFilter)?.shortLabel || ''} Expenses`
                        : `No Expenses Logged on this Date`
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

                  {/* 1-Tap Quick Presets shown contextually in Empty State */}
                  {categoryFilter === 'all' && (
                    <div className={styles.emptyPresetsBlock}>
                      <span className={styles.emptyPresetsTitle}>Quick 1-tap log:</span>
                      <div className={styles.emptyPresetsGrid}>
                        {workshopPresets.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={styles.emptyPresetBtn}
                            onClick={() =>
                              handleOpenCreateModal({
                                amount: p.amount,
                                category: p.category,
                                description: p.description,
                                method: p.method,
                              })
                            }
                          >
                            + {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.ledgerCard}>
                  {filteredExpenses.map((e) => {
                    const catObj = EXPENSE_CATEGORIES.find((c) => c.key === e.category);
                    const linkedOrder = e.orderId ? orders?.find((o) => o.id === e.orderId) : null;

                    return (
                      <div
                        key={e.id}
                        className={styles.ledgerRow}
                        onClick={() => handleOpenEditModal(e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evt) => {
                          if (evt.key === 'Enter' || evt.key === ' ') {
                            evt.preventDefault();
                            handleOpenEditModal(e);
                          }
                        }}
                      >
                        <div className={styles.ledgerLeft}>
                          <div className={`${styles.expenseItemIconWrap} ${styles['icon_' + e.category] || ''}`}>
                            <Symbol name={catObj?.icon || 'receipt_long'} size={17} />
                          </div>
                          <div className={styles.ledgerDetails}>
                            <span className={styles.ledgerTitle}>
                              {e.description || catObj?.label || 'Shop Expense'}
                            </span>
                            <div className={styles.ledgerMeta}>
                              <span className={styles.methodBadge}>
                                {e.method === 'transfer' ? 'Transfer' : 'Cash'}
                              </span>
                              <span className={styles.metaDot}>·</span>
                              <span className={`${styles.categoryBadge} ${styles['badge_' + e.category] || ''}`}>
                                {catObj?.shortLabel || e.category}
                              </span>
                              {linkedOrder && (
                                <>
                                  <span className={styles.metaDot}>·</span>
                                  <button
                                    type="button"
                                    className={styles.orderBadgeBtn}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      router.push(ROUTES.productionOrder(linkedOrder.id));
                                    }}
                                    title={`View Order #${linkedOrder.id.slice(0, 6).toUpperCase()} in Production`}
                                  >
                                    Order #{linkedOrder.id.slice(0, 6).toUpperCase()} &rarr;
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.ledgerRight}>
                          <span className={styles.ledgerAmount}>
                            −{currencySymbol}{formatNumber(e.amount)}
                          </span>

                          <button
                            type="button"
                            className={styles.rowDeleteQuickBtn}
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleDeleteExpense(e.id);
                            }}
                            aria-label="Delete expense"
                            title="Delete expense"
                          >
                            <Symbol name="delete" size={14} />
                          </button>
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

      {/* ── 6. RECORD / EDIT EXPENSE BOTTOMSHEET (Smooth & Native) ── */}
      <BottomSheet
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpenseId(null);
        }}
        variant="panel"
        title={editingExpenseId ? 'Edit Shop Expense' : 'Record Shop Expense'}
        footer={
          <div className={styles.modalActions}>
            {editingExpenseId ? (
              <button
                type="button"
                className={styles.modalDeleteBtn}
                onClick={() => {
                  const idToDelete = editingExpenseId;
                  setExpenseModalOpen(false);
                  setEditingExpenseId(null);
                  handleDeleteExpense(idToDelete);
                }}
              >
                <Symbol name="delete" size={15} />
                <span>Delete</span>
              </button>
            ) : (
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
            )}

            <button
              type="submit"
              form="reconExpenseForm"
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
        }
      >
        <form id="reconExpenseForm" onSubmit={handleRecordExpense} className={styles.modalForm}>
          {/* 1-Tap Quick Fill Presets (Create mode only) */}
          {!editingExpenseId && (
            <div className={styles.modalPresetRow}>
              <span className={styles.modalPresetLabel}>Quick presets:</span>
              <div className={styles.modalPresetChips}>
                {workshopPresets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.modalPresetChip}
                    onClick={() => {
                      setExpAmount(p.amount);
                      setExpCategory(p.category);
                      setExpDescription(p.description);
                      setExpMethod(p.method);
                    }}
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount Field with 1-Tap Quick Pills */}
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
                style={{ paddingLeft: `${Math.max(38, currencySymbol.length * 13 + 18)}px` }}
                placeholder="0"
                value={expAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            </div>

            {/* Clean Quick Amount Pills */}
            <div className={styles.amountQuickRow}>
              <div className={styles.quickAmountPills}>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={styles.quickAmountBtn}
                    onClick={() => handleAddQuickAmount(amt)}
                  >
                    +{formatNumber(amt)}
                  </button>
                ))}
              </div>
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

          {/* Expense Category */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Category</label>
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
            <label className={styles.fieldLabel}>Payment Method</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'cash' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('cash')}
              >
                <Symbol name="payments" size={16} />
                <span>Cash from Drawer</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${expMethod === 'transfer' ? styles.toggleBtnActive : ''}`}
                onClick={() => setExpMethod('transfer')}
              >
                <Symbol name="account_balance" size={16} />
                <span>Bank Transfer / POS</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="expDescInput">
              Description (Optional)
            </label>
            <input
              id="expDescInput"
              type="text"
              className={styles.textInput}
              placeholder="e.g. 5 spools thread, fuel, machine needle"
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
            />
          </div>

          {/* Expense Date & Order Link in Clean Row */}
          <div className={styles.metaFieldsRow}>
            <div className={styles.fieldHalf}>
              <label className={styles.fieldLabel} htmlFor="expDateField">
                Date
              </label>
              <input
                id="expDateField"
                type="date"
                className={styles.textInput}
                value={expDate}
                onChange={(e) => e.target.value && setExpDate(e.target.value)}
              />
            </div>

            {selectableOrders.length > 0 && (
              <div className={styles.fieldHalf}>
                <label className={styles.fieldLabel} htmlFor="expOrderSelect">
                  Link Order (Optional)
                </label>
                <select
                  id="expOrderSelect"
                  className={styles.selectInput}
                  value={expOrderId}
                  onChange={(e) => setExpOrderId(e.target.value)}
                >
                  <option value="">General Overhead</option>
                  {selectableOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id.slice(0, 6).toUpperCase()} · {o.customerName || 'Customer'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </form>
      </BottomSheet>
    </PageLayout>
  );
}