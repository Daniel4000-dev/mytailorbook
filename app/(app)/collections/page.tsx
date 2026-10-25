'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatPhone, getWhatsAppLink } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';
import TopBar from '@/components/layout/TopBar/TopBar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import Symbol from '@/components/ui/Symbol/Symbol';
import Avatar from '@/components/ui/Avatar/Avatar';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { addPayment } from '@/app/actions/order_payments';
import type { Order, Customer, PaymentMethod } from '@/lib/types';
import styles from './page.module.css';

interface DebtorOrder {
  order: Order;
  customer: Customer;
  balance: number;
}

type StatusFilter = 'all' | 'ready_delivered' | 'in_production';
type SortOption = 'highest_balance' | 'newest' | 'name';

export default function CollectionsPage() {
  const { orders, customers, currentShop, updateOrder, isLoaded, isDemoMode } = useData();
  const currency = currentShop?.currency || 'NGN';
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('highest_balance');

  // Quick Pay State
  const [payingDebtor, setPayingDebtor] = useState<DebtorOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('transfer');
  const [payNote, setPayNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // All unpaid orders mapped to debtors
  const allDebtors = useMemo(() => {
    if (!orders || !customers) return [];

    const unpaid: DebtorOrder[] = [];

    orders.forEach((order) => {
      const balance = getBalanceOwed(order);
      if (balance > 0) {
        const foundCustomer = customers.find((c) => c.id === order.customerId);
        const customer: Customer = foundCustomer || {
          id: order.customerId || `adhoc-${order.id}`,
          shopId: order.shopId,
          fullName: order.customerName || 'Walk-in Client',
          whatsappNumber: '',
          gender: 'male',
          createdAt: order.createdAt,
        };
        unpaid.push({ order, customer, balance });
      }
    });

    return unpaid;
  }, [orders, customers]);

  // Aggregate metrics
  const totalOutstanding = useMemo(
    () => allDebtors.reduce((sum, d) => sum + d.balance, 0),
    [allDebtors]
  );

  const totalOwingClients = useMemo(
    () => new Set(allDebtors.map((d) => d.customer.id)).size,
    [allDebtors]
  );

  const readyDeliveredCount = useMemo(
    () =>
      allDebtors.filter(
        (d) => d.order.status === 'Ready' || d.order.status === 'Delivered'
      ).length,
    [allDebtors]
  );

  const readyDeliveredDebt = useMemo(
    () =>
      allDebtors
        .filter(
          (d) => d.order.status === 'Ready' || d.order.status === 'Delivered'
        )
        .reduce((sum, d) => sum + d.balance, 0),
    [allDebtors]
  );

  const inProductionCount = useMemo(
    () =>
      allDebtors.filter(
        (d) => d.order.status !== 'Ready' && d.order.status !== 'Delivered'
      ).length,
    [allDebtors]
  );

  // Filtered & Sorted debtors
  const filteredDebtors = useMemo(() => {
    let result = [...allDebtors];

    // Status filter
    if (statusFilter === 'ready_delivered') {
      result = result.filter(
        (d) => d.order.status === 'Ready' || d.order.status === 'Delivered'
      );
    } else if (statusFilter === 'in_production') {
      result = result.filter(
        (d) => d.order.status !== 'Ready' && d.order.status !== 'Delivered'
      );
    }

    // Text search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          d.customer.fullName.toLowerCase().includes(q) ||
          d.customer.whatsappNumber.includes(q) ||
          d.order.orderDetails.toLowerCase().includes(q) ||
          (d.order.styleName && d.order.styleName.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'highest_balance') {
        return b.balance - a.balance;
      }
      if (sortBy === 'newest') {
        return new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime();
      }
      if (sortBy === 'name') {
        return a.customer.fullName.localeCompare(b.customer.fullName);
      }
      return 0;
    });

    return result;
  }, [allDebtors, statusFilter, searchQuery, sortBy]);

  // Courteous Nigerian atelier WhatsApp message builder
  const buildReminderMessage = (debtor: DebtorOrder) => {
    const shopName = currentShop?.name || 'our atelier';
    const amount = formatCurrency(debtor.balance, currency);
    const receiptUrl = `https://mytailorbook.com/receipt/${debtor.order.id}`;

    let stageContext = 'currently in production';
    if (debtor.order.status === 'Delivered') {
      stageContext = 'which was recently collected/delivered';
    } else if (debtor.order.status === 'Ready') {
      stageContext = 'which is finished and ready for pickup at our atelier';
    }

    return `Hello ${debtor.customer.fullName},\n\nWarm greetings from ${shopName}.\n\nThis is a gentle update regarding the outstanding balance of ${amount} for your bespoke order "${debtor.order.orderDetails}" (${stageContext}).\n\nYou can review your live digital invoice & receipt here:\n${receiptUrl}\n\nPlease let us know once convenient for payment or transfer. Thank you for your continued patronage!`;
  };

  const handleWhatsAppReminder = (debtor: DebtorOrder) => {
    if (!debtor.customer.whatsappNumber) {
      showToast('Client has no WhatsApp number on file', 'error');
      return;
    }
    const message = buildReminderMessage(debtor);
    const link = getWhatsAppLink(debtor.customer.whatsappNumber, message);
    window.open(link, '_blank');
  };

  const handleCopyReminder = (debtor: DebtorOrder) => {
    const message = buildReminderMessage(debtor);
    navigator.clipboard.writeText(message);
    setCopiedOrderId(debtor.order.id);
    showToast('Payment reminder copied to clipboard!', 'success');
    setTimeout(() => {
      setCopiedOrderId((prev) => (prev === debtor.order.id ? null : prev));
    }, 2500);
  };

  const handleOpenQuickPay = (debtor: DebtorOrder) => {
    setPayingDebtor(debtor);
    setPayAmount(String(debtor.balance));
    setPayMethod('transfer');
    setPayNote('');
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebtor) return;
    const numAmount = parseInt(payAmount.replace(/[^0-9]/g, ''), 10) || 0;
    if (numAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setIsSubmitting(true);
    let error: string | undefined;
    if (!isDemoMode) {
      const res = await addPayment(payingDebtor.order.id, numAmount, payMethod, payNote);
      error = res.error;
    }
    setIsSubmitting(false);

    if (error) {
      showToast(error, 'error');
    } else {
      const newDeposit = (payingDebtor.order.depositPaid || 0) + numAmount;
      await updateOrder(payingDebtor.order.id, { depositPaid: newDeposit });

      const remaining = payingDebtor.order.totalBill - newDeposit;
      const debtorSnapshot = { ...payingDebtor };

      showToast(
        remaining <= 0
          ? `Settled in full! ${debtorSnapshot.order.orderDetails} is now 100% paid.`
          : `Recorded ${formatCurrency(numAmount, currency)}! Remaining balance: ${formatCurrency(remaining, currency)}.`,
        'success',
        debtorSnapshot.customer.whatsappNumber
          ? {
              label: 'WhatsApp Receipt',
              onClick: () => {
                const receiptUrl = `https://mytailorbook.com/receipt/${debtorSnapshot.order.id}`;
                const receiptMsg = `Hello ${debtorSnapshot.customer.fullName},\n\nWe have received your payment of ${formatCurrency(numAmount, currency)} for "${debtorSnapshot.order.orderDetails}". Thank you!\n\nView updated digital receipt:\n${receiptUrl}`;
                window.open(getWhatsAppLink(debtorSnapshot.customer.whatsappNumber, receiptMsg), '_blank');
              },
            }
          : undefined
      );

      setPayingDebtor(null);
      setPayAmount('');
      setPayNote('');
    }
  };

  // Loading skeleton state
  if (!isLoaded) {
    return (
      <>
        <TopBar title="Collections" showBack />
        <div className={styles.container}>
          <div className={styles.skeletonHero} />
          <div className={styles.skeletonControls} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Collections" showBack />
      <div className={styles.container}>
        {/* Atelier Debt Hero Header */}
        <section className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div className={styles.heroBadge}>
              <Symbol name="account_balance_wallet" size={14} />
              <span>Outstanding Atelier Balances</span>
            </div>
            {readyDeliveredDebt > 0 && (
              <span className={styles.riskBadge}>
                {formatCurrency(readyDeliveredDebt, currency)} in Delivered Outfits
              </span>
            )}
          </div>

          <div className={styles.heroAmountRow}>
            <span className={styles.heroCurrencySymbol}>
              {currency === 'NGN' ? '₦' : currency}
            </span>
            <span className={styles.heroAmountValue}>
              {totalOutstanding.toLocaleString()}
            </span>
          </div>

          <div className={styles.heroStatsRow}>
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatLabel}>Clients with Balance</span>
              <span className={styles.heroStatValue}>{totalOwingClients}</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatLabel}>Delivered / Ready</span>
              <span className={styles.heroStatValue}>{readyDeliveredCount}</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatLabel}>In Production</span>
              <span className={styles.heroStatValue}>{inProductionCount}</span>
            </div>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.searchBar}>
            <Symbol name="search" size={18} style={{ color: 'var(--sf-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by client name, phone, or outfit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              enterKeyHint="search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.clearSearchBtn}
                aria-label="Clear search"
              >
                <Symbol name="close" size={16} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className={styles.filterPillsTrack}>
            <FilterPill
              label="All Debtors"
              count={allDebtors.length}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterPill
              label="Ready / Delivered"
              count={readyDeliveredCount}
              active={statusFilter === 'ready_delivered'}
              color="#DC2626"
              colorBg="rgba(220, 38, 38, 0.12)"
              onClick={() => setStatusFilter('ready_delivered')}
            />
            <FilterPill
              label="In Production"
              count={inProductionCount}
              active={statusFilter === 'in_production'}
              onClick={() => setStatusFilter('in_production')}
            />
          </div>

          {/* Sort & Count Header */}
          <div className={styles.listMetaRow}>
            <span className={styles.resultsCount}>
              Showing {filteredDebtors.length} {filteredDebtors.length === 1 ? 'order' : 'orders'}
            </span>
            <div className={styles.sortWrapper}>
              <label htmlFor="debtor-sort" className={styles.sortLabel}>Sort by:</label>
              <select
                id="debtor-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.sortSelect}
              >
                <option value="highest_balance">Highest Balance</option>
                <option value="newest">Newest Orders</option>
                <option value="name">Client Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Debtor List */}
        {filteredDebtors.length === 0 ? (
          <div className={styles.emptyContainer}>
            <EmptyState
              icon={<Symbol name="check_circle" size={40} />}
              title={searchQuery ? 'No matching balances' : 'All clear! Zero outstanding debts'}
              description={
                searchQuery
                  ? `No clients or outfits matching "${searchQuery}".`
                  : 'All client orders are fully paid. The atelier balance sheet is 100% balanced.'
              }
            />
            {searchQuery && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear Search Filter
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.debtorsList}>
            {filteredDebtors.map((debtor) => {
              const stageConfig = STATUS_CONFIG[debtor.order.status];
              const isUrgent = debtor.order.status === 'Delivered' || debtor.order.status === 'Ready';

              return (
                <article key={debtor.order.id} className={styles.debtorCard}>
                  {/* Top Card Header */}
                  <div className={styles.debtorHeader}>
                    <div className={styles.customerBlock}>
                      <Avatar name={debtor.customer.fullName} size="md" shape="squircle" />
                      <div className={styles.customerMeta}>
                        <div className={styles.nameRow}>
                          <Link
                            href={ROUTES.customerDetail(debtor.customer.id)}
                            className={styles.customerNameLink}
                          >
                            {debtor.customer.fullName}
                          </Link>
                          {debtor.customer.whatsappNumber && (
                            <a
                              href={`tel:${debtor.customer.whatsappNumber}`}
                              className={styles.phoneChip}
                              title="Call customer directly"
                            >
                              <Symbol name="call" size={12} />
                              <span>{formatPhone(debtor.customer.whatsappNumber)}</span>
                            </a>
                          )}
                        </div>
                        <span className={styles.orderTitle}>{debtor.order.orderDetails}</span>
                      </div>
                    </div>

                    {/* Balance Capsule */}
                    <div className={styles.balanceCapsule}>
                      <span className={styles.balanceDueTag}>
                        {formatCurrency(debtor.balance, currency)} Due
                      </span>
                      <span className={styles.balanceFormula}>
                        Paid {formatCurrency(debtor.order.depositPaid || 0, currency)} of{' '}
                        {formatCurrency(debtor.order.totalBill, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Stage & Metadata Strip */}
                  <div className={styles.cardStrip}>
                    <div
                      className={styles.stageTag}
                      style={{
                        color: stageConfig.color,
                        backgroundColor: stageConfig.bgColor,
                      }}
                    >
                      <Symbol name={stageConfig.icon} size={14} />
                      <span>{stageConfig.label}</span>
                    </div>
                    {isUrgent && (
                      <span className={styles.urgentBadge}>
                        <Symbol name="priority_high" size={12} />
                        <span>{debtor.order.status === 'Delivered' ? 'Out of Shop' : 'Ready for Pickup'}</span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className={styles.cardActionsRow}>
                    <Button
                      variant="primary"
                      className={styles.quickPayBtn}
                      onClick={() => handleOpenQuickPay(debtor)}
                      icon={<Symbol name="payments" size={18} />}
                    >
                      Quick Pay
                    </Button>

                    {debtor.customer.whatsappNumber ? (
                      <button
                        type="button"
                        className={styles.whatsAppBtn}
                        onClick={() => handleWhatsAppReminder(debtor)}
                        title="Send courteous reminder on WhatsApp"
                      >
                        <WhatsappIcon size={18} />
                        <span>WhatsApp</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.whatsAppBtnDisabled}
                        disabled
                        title="No WhatsApp number registered"
                      >
                        <WhatsappIcon size={18} />
                        <span>No Phone</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.iconActionBtn}
                      onClick={() => handleCopyReminder(debtor)}
                      title="Copy polite reminder text to clipboard"
                      aria-label="Copy reminder"
                    >
                      <Symbol
                        name={copiedOrderId === debtor.order.id ? 'check_circle' : 'content_copy'}
                        size={18}
                        style={{ color: copiedOrderId === debtor.order.id ? '#10B981' : 'var(--sf-text-secondary)' }}
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Pay BottomSheet */}
      <BottomSheet
        isOpen={!!payingDebtor}
        onClose={() => setPayingDebtor(null)}
        title="Record Debt Settlement"
        variant="panel"
      >
        {payingDebtor && (
          <form onSubmit={handleQuickPaySubmit} className={styles.quickPayForm}>
            {/* Context Header */}
            <div className={styles.sheetContextCard}>
              <div className={styles.sheetContextAvatar}>
                <Avatar name={payingDebtor.customer.fullName} size="md" shape="squircle" />
              </div>
              <div className={styles.sheetContextDetails}>
                <span className={styles.sheetCustomerName}>{payingDebtor.customer.fullName}</span>
                <span className={styles.sheetOrderName}>{payingDebtor.order.orderDetails}</span>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className={styles.sheetLedger}>
              <div className={styles.ledgerRow}>
                <span>Total Bill</span>
                <span>{formatCurrency(payingDebtor.order.totalBill, currency)}</span>
              </div>
              <div className={styles.ledgerRow}>
                <span>Already Paid</span>
                <span>{formatCurrency(payingDebtor.order.depositPaid || 0, currency)}</span>
              </div>
              <div className={styles.ledgerDivider} />
              <div className={`${styles.ledgerRow} ${styles.ledgerDueRow}`}>
                <span>Outstanding Balance</span>
                <span className={styles.ledgerDueValue}>
                  {formatCurrency(payingDebtor.balance, currency)}
                </span>
              </div>
            </div>

            {/* Wallet Balance Alert */}
            {payingDebtor.customer.wallet_balance && payingDebtor.customer.wallet_balance > 0 && (
              <div className={styles.walletCallout}>
                <div className={styles.walletCalloutText}>
                  <Symbol name="account_balance_wallet" size={16} />
                  <span>
                    Client has {formatCurrency(payingDebtor.customer.wallet_balance, currency)} store credit available.
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.applyWalletBtn}
                  onClick={() => {
                    const usable = Math.min(
                      payingDebtor.customer.wallet_balance || 0,
                      payingDebtor.balance
                    );
                    setPayAmount(String(usable));
                    setPayMethod('store_credit');
                    setPayNote('Applied from customer store credit');
                  }}
                >
                  Apply Store Credit
                </button>
              </div>
            )}

            {/* Amount Presets */}
            <div className={styles.presetChipsRow}>
              <button
                type="button"
                className={`${styles.presetChip} ${payAmount === String(payingDebtor.balance) ? styles.presetChipActive : ''}`}
                onClick={() => setPayAmount(String(payingDebtor.balance))}
              >
                Full Balance ({formatCurrency(payingDebtor.balance, currency)})
              </button>
              <button
                type="button"
                className={`${styles.presetChip} ${payAmount === String(Math.round(payingDebtor.balance / 2)) ? styles.presetChipActive : ''}`}
                onClick={() => setPayAmount(String(Math.round(payingDebtor.balance / 2)))}
              >
                50% ({formatCurrency(Math.round(payingDebtor.balance / 2), currency)})
              </button>
            </div>

            {/* Input Grid */}
            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <MoneyInput
                  label="Payment Amount"
                  value={payAmount}
                  onChange={setPayAmount}
                  placeholder="e.g. 25000"
                  required
                />
              </div>
              <div className={styles.formCol}>
                <Select
                  label="Method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  options={[
                    { value: 'transfer', label: 'Bank Transfer' },
                    { value: 'cash', label: 'Cash Drawer' },
                    { value: 'pos', label: 'POS Terminal' },
                    { value: 'store_credit', label: 'Store Credit / Wallet' },
                  ]}
                />
              </div>
            </div>

            {/* Reference Note */}
            <div className={styles.noteFieldWrapper}>
              <label htmlFor="pay-note" className={styles.noteLabel}>
                Reference / Note (Optional)
              </label>
              <input
                id="pay-note"
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. GTBank transfer, Cash given at fitting"
                className={styles.noteInput}
              />
            </div>

            {/* Submit Action */}
            <div className={styles.sheetActionsRow}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPayingDebtor(null)}
                className={styles.cancelSheetBtn}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !payAmount || parseInt(payAmount, 10) <= 0}
                loading={isSubmitting}
                className={styles.confirmPayBtn}
                icon={<Symbol name="payments" size={18} />}
              >
                Confirm Payment
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
