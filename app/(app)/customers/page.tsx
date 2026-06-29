'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserSlash, FaPhone, FaChevronRight, FaWhatsapp } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import SearchBar from '@/components/ui/SearchBar/SearchBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { formatPhone, formatCurrency } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import styles from './page.module.css';

export default function CustomersPage() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const { customers, orders } = useData();
  const [search, setSearch] = useState('');

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

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customers" />}>
        <EmptyState icon={<FaUserSlash />} title="Access Denied" description="Only owners can view the customer directory." />
      </PageLayout>
    );
  }

  const filtered = customers.filter((c) => {
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

        {filtered.length === 0 ? (
          <EmptyState icon={<FaUserSlash />} title="No customers found" description="Try a different search term" />
        ) : (
          <>
            {/* Mobile View */}
            <div className={styles.mobileList}>
              {filtered.map((c, i) => {
                const stats = customerStats[c.id];
                return (
                  <div key={c.id} className={styles.mobileCard} style={{ animationDelay: `${i * 0.04}s` }} onClick={() => router.push(`/customers/${c.id}`)}>
                    <div className={styles.cardHeader}>
                      <Avatar name={c.fullName} size="md" />
                      <div className={styles.cardInfo}>
                        <span className={styles.name}>{c.fullName}</span>
                        <span className={styles.phone}>{formatPhone(c.whatsappNumber)}</span>
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
                  {filtered.map((c, i) => {
                    const stats = customerStats[c.id];
                    return (
                      <tr key={c.id} className={styles.tableRow} style={{ animationDelay: `${i * 0.04}s` }} onClick={() => router.push(`/customers/${c.id}`)}>
                        <td>
                          <div className={styles.customerCell}>
                            <Avatar name={c.fullName} size="sm" />
                            <span className={styles.name}>{c.fullName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.phone}>{formatPhone(c.whatsappNumber)}</span>
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
          </>
        )}
      </PageLayout>
  );
}
