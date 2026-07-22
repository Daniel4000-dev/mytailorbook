'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserSlash, FaPhone, FaChevronRight, FaWhatsapp } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import SearchBar from '@/components/ui/SearchBar/SearchBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { formatPhone, formatCurrency, formatShortMonthYear } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import { GARMENT_STYLES } from '@/lib/constants';
import CustomersSkeleton from './CustomersSkeleton';
import styles from './page.module.css';

const PAGE_SIZE = 40;
type GenderFilter = 'all' | 'male' | 'female';

export default function CustomersPage() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const { customers, orders, isLoaded } = useData();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);

  // Calculate order stats per customer
  const customerStats = useMemo(() => {
    const stats: Record<string, { totalOrders: number; activeOrders: number; totalSpend: number; totalBalance: number }> = {};
    
    customers.forEach(c => {
      stats[c.id] = { totalOrders: 0, activeOrders: 0, totalSpend: 0, totalBalance: 0 };
    });

    orders.forEach(o => {
      if (stats[o.customerId]) {
        stats[o.customerId].totalOrders += 1;
        if (o.status !== 'Completed') {
          stats[o.customerId].activeOrders += 1;
        }
        stats[o.customerId].totalSpend += o.totalBill;
        stats[o.customerId].totalBalance += getBalanceOwed(o);
      }
    });
    return stats;
  }, [customers, orders]);

  // Rows are plain divs/<tr>s (not <Link>), so Next never gets a chance to
  // prefetch these routes on its own — warm them proactively instead of
  // waiting for the click, capped so a very large customer book doesn't
  // fire an unbounded burst of requests.
  useEffect(() => {
    if (!isLoaded) return;
    customers.slice(0, 60).forEach((c) => router.prefetch(`/customers/${c.id}`));
  }, [isLoaded, customers, router]);

  // A new search/filter should start back at the first page rather than
  // staying scrolled deep into a now-irrelevant "load more" position.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setVisibleCount(PAGE_SIZE), [search, genderFilter, styleFilter]);

  // Styles offered in the filter sheet are only ones actually in use by this
  // shop's own customers (scoped to the active gender filter) — never the
  // full static catalog, so a tailor never picks a style that returns zero
  // results. Each resolves to its catalog photo when it's a built-in style;
  // custom styles (free text, no catalog entry) fall back to a text-only chip.
  const availableStyles = useMemo(() => {
    const scoped = genderFilter === 'all' ? customers : customers.filter((c) => c.gender === genderFilter);
    const names = new Set<string>();
    scoped.forEach((c) => c.preferredStyles?.forEach((s) => names.add(s)));
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, photoUrl: GARMENT_STYLES.find((g) => g.name === name)?.photoUrl }));
  }, [customers, genderFilter]);

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customers" />}>
        <EmptyState icon={<FaUserSlash />} title="Access Denied" description="Only owners can view the customer directory." />
      </PageLayout>
    );
  }

  if (!isLoaded) {
    return (
      <PageLayout header={<TopBar title="Customers" />}>
        <CustomersSkeleton />
      </PageLayout>
    );
  }

  const filtered = customers.filter((c) => {
    if (genderFilter !== 'all' && c.gender !== genderFilter) return false;
    if (styleFilter && !c.preferredStyles?.includes(styleFilter)) return false;
    const q = search.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.whatsappNumber.includes(q);
  });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => customerStats[c.id]?.activeOrders > 0).length;

  return (
    <PageLayout header={<TopBar title="Customers" />}>
        
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalCustomers}</div>
            <div className={styles.statLabel}>Total Customers</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{activeCustomers}</div>
            <div className={styles.statLabel}>Active Orders</div>
          </div>
        </div>

        <div className={styles.actionArea}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone..." />
        </div>

        <div className={styles.pillRow}>
          <FilterPill label="All" active={genderFilter === 'all'} onClick={() => setGenderFilter('all')} />
          <FilterPill
            label="Male"
            active={genderFilter === 'male'}
            onClick={() => {
              setGenderFilter('male');
              if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'male')) {
                setStyleFilter(null);
              }
            }}
          />
          <FilterPill
            label="Female"
            active={genderFilter === 'female'}
            onClick={() => {
              setGenderFilter('female');
              if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'female')) {
                setStyleFilter(null);
              }
            }}
          />
          <FilterPill
            label={styleFilter || 'Style'}
            active={!!styleFilter}
            onClick={() => setIsStyleSheetOpen(true)}
          />
        </div>

        <BottomSheet isOpen={isStyleSheetOpen} onClose={() => setIsStyleSheetOpen(false)} title="Filter by Style">
          {availableStyles.length === 0 ? (
            <p className={styles.noStylesHint}>No preferred styles recorded yet for this filter.</p>
          ) : (
            <div className={styles.styleFilterGrid}>
              {availableStyles.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={`${styles.styleFilterCard} ${styleFilter === s.name ? styles.styleFilterCardSelected : ''}`}
                  onClick={() => {
                    setStyleFilter(styleFilter === s.name ? null : s.name);
                    setIsStyleSheetOpen(false);
                  }}
                >
                  {s.photoUrl ? (
                    <div className={styles.styleFilterPhoto}>
                      <img src={s.photoUrl} alt="" />
                    </div>
                  ) : (
                    <div className={styles.styleFilterPhoto} aria-hidden="true" />
                  )}
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </BottomSheet>

        {filtered.length === 0 ? (
          customers.length === 0 ? (
            <EmptyState
              icon={<FaUserSlash />}
              title="No customers yet"
              description="Your customer book starts with your first order — create one and the customer is saved here automatically."
            />
          ) : (
            <EmptyState icon={<FaUserSlash />} title="No customers found" description="Try a different search or filter" />
          )
        ) : (
          <>
            {/* Mobile View */}
            <div className={styles.mobileList}>
              {filtered.slice(0, visibleCount).map((c, i) => {
                const stats = customerStats[c.id];
                return (
                  <div key={c.id} className={styles.mobileCard} style={{ animationDelay: `${Math.min(i, 20) * 0.04}s` }} onClick={() => router.push(`/customers/${c.id}`)}>
                    <div className={styles.cardHeader}>
                      <Avatar name={c.fullName} size="md" />
                      <div className={styles.cardInfo}>
                        <span className={styles.name}>{c.fullName}</span>
                        <span className={styles.phone}>{formatPhone(c.whatsappNumber)}</span>
                        <span className={styles.addedDate}>Added {formatShortMonthYear(c.createdAt)}</span>
                      </div>
                      <div className={styles.cardActionIcon}>
                        <FaChevronRight />
                      </div>
                    </div>
                    <div className={styles.cardMetrics}>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Orders</span>
                        <span className={styles.metricValue}>{stats.totalOrders}</span>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Spend</span>
                        <span className={styles.metricValue}>{formatCurrency(stats.totalSpend)}</span>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Balance</span>
                        <span className={`${styles.metricValue} ${stats.totalBalance > 0 ? styles.hasBalance : ''}`}>
                          {formatCurrency(stats.totalBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className={styles.desktopTableContainer}>
              <table className={styles.desktopTable}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Orders (Active)</th>
                    <th>Total Spend</th>
                    <th>Balance</th>
                    <th className={styles.alignRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, visibleCount).map((c, i) => {
                    const stats = customerStats[c.id];
                    return (
                      <tr key={c.id} className={styles.tableRow} style={{ animationDelay: `${Math.min(i, 20) * 0.04}s` }} onClick={() => router.push(`/customers/${c.id}`)}>
                        <td>
                          <div className={styles.customerCell}>
                            <Avatar name={c.fullName} size="sm" />
                            <span className={styles.name}>{c.fullName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.phone}>{formatPhone(c.whatsappNumber)}</span>
                          <span className={styles.addedDate}>Added {formatShortMonthYear(c.createdAt)}</span>
                        </td>
                        <td>
                          <span className={styles.orderBadge}>
                            {stats.totalOrders} ({stats.activeOrders} active)
                          </span>
                        </td>
                        <td>
                          <span className={styles.currencyCell}>{formatCurrency(stats.totalSpend)}</span>
                        </td>
                        <td>
                          <span className={`${styles.currencyCell} ${stats.totalBalance > 0 ? styles.hasBalance : ''}`}>
                            {formatCurrency(stats.totalBalance)}
                          </span>
                        </td>
                        <td className={styles.alignRight}>
                          <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${c.whatsappNumber}`} className={styles.actionBtn} aria-label="Call">
                              <FaPhone />
                            </a>
                            <a href={`https://wa.me/${c.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtn} aria-label="WhatsApp">
                              <FaWhatsapp /> WhatsApp
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > visibleCount && (
              <button
                type="button"
                className={styles.loadMoreBtn}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </PageLayout>
  );
}
