'use client';

import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { User } from '@/lib/types';
import styles from './ProductionFilterSheet.module.css';

interface ProductionFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Scope
  filterMyTasks: boolean;
  setFilterMyTasks: (val: boolean) => void;
  staffFilterId: string | null;
  setStaffFilterId: (id: string | null) => void;
  staffMembers: User[];
  isOwnerLike: boolean;
  totalOrdersCount: number;
  myOrdersCount: number;
  // Attention / Urgency
  opFilter: 'all' | 'rush' | 'due' | 'hold' | 'unpaid';
  setOpFilter: (filter: 'all' | 'rush' | 'due' | 'hold' | 'unpaid') => void;
  rushCount: number;
  dueCount: number;
  holdCount: number;
  unpaidCount: number;
  // Reset & State
  onReset: () => void;
  hasActiveFilters: boolean;
}

export default function ProductionFilterSheet({
  isOpen,
  onClose,
  filterMyTasks,
  setFilterMyTasks,
  staffFilterId,
  setStaffFilterId,
  staffMembers,
  isOwnerLike,
  totalOrdersCount,
  myOrdersCount,
  opFilter,
  setOpFilter,
  rushCount,
  dueCount,
  holdCount,
  unpaidCount,
  onReset,
  hasActiveFilters,
}: ProductionFilterSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} variant="modal" noPadding>
      <div className={styles.sheetContainer}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Filter Garments</h2>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={onReset}
            >
              Reset All
            </button>
          )}
        </div>

        {/* 1. Scope Section (For owners/managers) */}
        {isOwnerLike && (
          <section className={styles.section}>
            <span className={styles.sectionLabel}>Order Assignment Scope</span>
            <div className={styles.scopeSegmentWrap} role="tablist" aria-label="Order Assignment Scope">
              <button
                type="button"
                role="tab"
                aria-selected={!filterMyTasks && !staffFilterId}
                className={`${styles.scopeSegmentBtn} ${!filterMyTasks && !staffFilterId ? styles.scopeSegmentActive : ''}`}
                onClick={() => {
                  setFilterMyTasks(false);
                  setStaffFilterId(null);
                }}
              >
                <span>All Orders</span>
                <span className={styles.countBadge}>{totalOrdersCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterMyTasks}
                className={`${styles.scopeSegmentBtn} ${filterMyTasks ? styles.scopeSegmentActive : ''}`}
                onClick={() => {
                  setFilterMyTasks(true);
                  setStaffFilterId(null);
                }}
              >
                <span>My Orders</span>
                <span className={styles.countBadge}>{myOrdersCount}</span>
              </button>
            </div>

            {/* Optional Specific Staff Picker */}
            {staffMembers.length > 0 && (
              <div className={styles.staffSelectWrap}>
                <select
                  value={staffFilterId || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setStaffFilterId(val);
                    if (val) setFilterMyTasks(false);
                  }}
                  className={styles.staffSelect}
                  aria-label="Filter by assigned artisan"
                >
                  <option value="">Filter by Specific Artisan…</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.uid} value={staff.uid}>
                      {staff.name} {staff.craftRole ? `(${staff.craftRole})` : ''}
                    </option>
                  ))}
                </select>
                <Symbol name="expand_more" size={18} className={styles.staffSelectIcon} />
              </div>
            )}
          </section>
        )}

        {/* 2. Attention & Urgency Section */}
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Attention & Urgency</span>
          <div className={styles.attentionGrid}>
            {/* Rush & Urgent */}
            <button
              type="button"
              className={`${styles.filterCard} ${opFilter === 'rush' ? styles.filterCardActive : ''}`}
              onClick={() => setOpFilter(opFilter === 'rush' ? 'all' : 'rush')}
            >
              <div className={styles.filterCardTop}>
                <span className={styles.filterCardIconCircle}>
                  <Symbol name="bolt" size={15} fill />
                </span>
                {opFilter === 'rush' && (
                  <span className={styles.filterCheckCircle}>
                    <Symbol name="check" size={12} />
                  </span>
                )}
              </div>
              <div className={styles.filterCardBottom}>
                <span className={styles.filterCardLabel}>Rush & Urgent</span>
                <span className={styles.filterCardCount}>{rushCount}</span>
              </div>
            </button>

            {/* Due Soon / Overdue */}
            <button
              type="button"
              className={`${styles.filterCard} ${opFilter === 'due' ? styles.filterCardActive : ''}`}
              onClick={() => setOpFilter(opFilter === 'due' ? 'all' : 'due')}
            >
              <div className={styles.filterCardTop}>
                <span className={styles.filterCardIconCircle}>
                  <Symbol name="schedule" size={15} />
                </span>
                {opFilter === 'due' && (
                  <span className={styles.filterCheckCircle}>
                    <Symbol name="check" size={12} />
                  </span>
                )}
              </div>
              <div className={styles.filterCardBottom}>
                <span className={styles.filterCardLabel}>Due Soon</span>
                <span className={styles.filterCardCount}>{dueCount}</span>
              </div>
            </button>

            {/* On Hold / Exceptions */}
            <button
              type="button"
              className={`${styles.filterCard} ${opFilter === 'hold' ? styles.filterCardActive : ''}`}
              onClick={() => setOpFilter(opFilter === 'hold' ? 'all' : 'hold')}
            >
              <div className={styles.filterCardTop}>
                <span className={styles.filterCardIconCircle}>
                  <Symbol name="warning" size={15} />
                </span>
                {opFilter === 'hold' && (
                  <span className={styles.filterCheckCircle}>
                    <Symbol name="check" size={12} />
                  </span>
                )}
              </div>
              <div className={styles.filterCardBottom}>
                <span className={styles.filterCardLabel}>On Hold</span>
                <span className={styles.filterCardCount}>{holdCount}</span>
              </div>
            </button>

            {/* Balance Due */}
            <button
              type="button"
              className={`${styles.filterCard} ${opFilter === 'unpaid' ? styles.filterCardActive : ''}`}
              onClick={() => setOpFilter(opFilter === 'unpaid' ? 'all' : 'unpaid')}
            >
              <div className={styles.filterCardTop}>
                <span className={styles.filterCardIconCircle}>
                  <Symbol name="payments" size={15} />
                </span>
                {opFilter === 'unpaid' && (
                  <span className={styles.filterCheckCircle}>
                    <Symbol name="check" size={12} />
                  </span>
                )}
              </div>
              <div className={styles.filterCardBottom}>
                <span className={styles.filterCardLabel}>Balance Due</span>
                <span className={styles.filterCardCount}>{unpaidCount}</span>
              </div>
            </button>
          </div>
        </section>

        {/* Footer Apply */}
        <button
          type="button"
          className={styles.applyBtn}
          onClick={onClose}
        >
          View Filtered Orders
        </button>
      </div>
    </BottomSheet>
  );
}
