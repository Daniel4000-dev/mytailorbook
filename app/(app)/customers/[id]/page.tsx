'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaWhatsapp, FaUserSlash, FaGift, FaUserGroup, FaCrown, FaStar, FaCircleUser } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import Badge from '@/components/ui/Badge/Badge';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import MeasurementAnatomy from '@/components/customers/MeasurementAnatomy/MeasurementAnatomy';
import OrderDetailSheet from '@/components/kanban/OrderDetailSheet/OrderDetailSheet';
import {
  formatCurrency,
  formatPhone,
  getWhatsAppLink,
  truncateText,
  formatMonthYear,
  getBirthdayMessage,
  getReEngagementMessage,
  getLoyaltyTier,
  getDaysUntilAnnualDate,
  getDaysSince,
  formatMeasurementLabel,
  formatDate,
} from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import type { Measurements, Customer, Order, User, MeasurementHistoryEntry } from '@/lib/types';
import { getMeasurementHistoryAction } from '@/app/actions';
import CustomerDetailSkeleton from './CustomerDetailSkeleton';
import styles from './page.module.css';

interface Point {
  id: string;
  name: string;
  x: number;
  y: number;
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { isOwner, user, loading: authLoading } = useAuth();
  const { customers, orders, isLoaded, updateCustomerMeasurements, updateOrder, updateCustomer } = useData();

  // Auth still resolving — show the skeleton, not "Access Denied". `isOwner`
  // is derived from `user`, which starts null before the session check
  // finishes, so checking it first would incorrectly deny a real owner for
  // a brief instant on every load (this reproduced consistently on staging).
  if (authLoading || !isLoaded) {
    return (
      <PageLayout className={styles.pageGrid} header={<TopBar title="Customer Details" showBack />}>
        <CustomerDetailSkeleton />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<FaUserSlash />} title="Access Denied" />
      </PageLayout>
    );
  }

  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<FaUserSlash />} title="Customer not found" />
      </PageLayout>
    );
  }

  return (
    <CustomerProfileContent
      customer={customer}
      customers={customers}
      orders={orders}
      isOwner={isOwner}
      user={user}
      updateCustomerMeasurements={updateCustomerMeasurements}
      updateOrder={updateOrder}
      updateCustomer={updateCustomer}
    />
  );
}

function CustomerProfileContent({
  customer,
  customers,
  orders,
  isOwner,
  user,
  updateCustomerMeasurements,
  updateOrder,
  updateCustomer,
}: {
  customer: Customer;
  customers: Customer[];
  orders: Order[];
  isOwner: boolean;
  user: User | null;
  updateCustomerMeasurements: ReturnType<typeof useData>['updateCustomerMeasurements'];
  updateOrder: ReturnType<typeof useData>['updateOrder'];
  updateCustomer: ReturnType<typeof useData>['updateCustomer'];
}) {
  const { showToast } = useToast();
  const { currentShop } = useData();

  // Initialize from customer measurements — this component only mounts once
  // real customer data is available, so these initializers see real values.
  const [measurements, setMeasurements] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (customer.measurements) {
      Object.entries(customer.measurements).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'notes') {
          initial[key] = String(val);
        }
      });
    }
    return initial;
  });

  const [styleNotes, setStyleNotes] = useState(customer.styleNotes || '');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [currentValue, setCurrentValue] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState(customer.dateOfBirth || '');
  const [editingReferrer, setEditingReferrer] = useState(false);
  const [referrerInput, setReferrerInput] = useState(customer.referredBy || '');
  const [showMeasurementHistory, setShowMeasurementHistory] = useState(false);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const id = customer.id;
  const custOrders = orders.filter((o) => o.customerId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalSpend = custOrders.reduce((s, o) => s + o.totalBill, 0);
  const totalOwed = custOrders.reduce((s, o) => s + getBalanceOwed(o), 0);

  const shopName = currentShop?.name || 'us';
  const loyalty = getLoyaltyTier(custOrders.length);
  const daysUntilBirthday = customer.dateOfBirth ? getDaysUntilAnnualDate(customer.dateOfBirth) : null;
  const birthdaySoon = daysUntilBirthday !== null && daysUntilBirthday <= 14;
  const mostRecentOrder = custOrders[0];
  const daysSinceLastOrder = mostRecentOrder ? getDaysSince(mostRecentOrder.createdAt) : getDaysSince(customer.createdAt);
  const isStale = custOrders.length > 0 ? daysSinceLastOrder >= 90 : daysSinceLastOrder >= 30;
  const referredByCustomer = customer.referredBy ? customers.find((c) => c.id === customer.referredBy) : null;
  const referredCustomers = customers.filter((c) => c.referredBy === customer.id);
  const referrerOptions = [
    { value: '', label: 'None' },
    ...customers.filter((c) => c.id !== customer.id).map((c) => ({ value: c.id, label: c.fullName })),
  ];

  const handleSaveBirthday = async () => {
    await updateCustomer(customer.id, { dateOfBirth: birthdayInput || undefined });
    setEditingBirthday(false);
    showToast('Birthday saved', 'success');
  };

  const handleSaveReferrer = async () => {
    await updateCustomer(customer.id, { referredBy: referrerInput || undefined });
    setEditingReferrer(false);
    showToast('Referral saved', 'success');
  };

  const handleOpenMeasurementHistory = async () => {
    setShowMeasurementHistory(true);
    setLoadingHistory(true);
    try {
      const history = await getMeasurementHistoryAction(customer.id);
      setMeasurementHistory(history);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePointSelect = (point: Point) => {
    setSelectedPoint(point);
    setCurrentValue(measurements[point.id] || '');
  };

  const handleMeasurementChange = (pointId: string, val: string) => {
    setMeasurements(prev => ({
      ...prev,
      [pointId]: val
    }));

    // Style notes moved to their own Customer field — measurements here
    // should only ever carry numbers, never the old nested `notes` string.
    const updatedMeasurements: Measurements = { ...customer.measurements };
    delete (updatedMeasurements as Record<string, unknown>).notes;

    const updatedRecord = { ...measurements, [pointId]: val };
    
    Object.entries(updatedRecord).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        (updatedMeasurements as any)[key] = num;
      }
    });
    
    const num = parseFloat(val);
    if (isNaN(num)) {
      delete (updatedMeasurements as any)[pointId];
    }
    
    updateCustomerMeasurements(customer.id, updatedMeasurements);
  };

  const handleSaveNotes = async () => {
    await updateCustomer(customer.id, { styleNotes: styleNotes || undefined });
    showToast('Notes saved', 'success');
  };

  const handleSaveMeasurement = () => {
    if (selectedPoint) {
      const newVal = currentValue;
      setMeasurements(prev => ({
        ...prev,
        [selectedPoint.id]: newVal
      }));
      
      const updatedMeasurements: Measurements = { ...customer.measurements };
      delete (updatedMeasurements as Record<string, unknown>).notes;

      Object.entries(measurements).forEach(([key, val]) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          (updatedMeasurements as any)[key] = num;
        }
      });

      const newNum = parseFloat(newVal);
      if (!isNaN(newNum)) {
        (updatedMeasurements as any)[selectedPoint.id] = newNum;
      } else {
        delete (updatedMeasurements as any)[selectedPoint.id];
      }
      
      updateCustomerMeasurements(customer.id, updatedMeasurements);
      showToast(`${selectedPoint.name} measurement saved`, 'success');
      setSelectedPoint(null);
    }
  };

  const handleClearMeasurement = () => {
    if (selectedPoint) {
      setMeasurements(prev => {
        const copy = { ...prev };
        delete copy[selectedPoint.id];
        return copy;
      });
      
      const updatedMeasurements: Measurements = { ...customer.measurements };
      delete (updatedMeasurements as Record<string, unknown>).notes;

      Object.entries(measurements).forEach(([key, val]) => {
        if (key !== selectedPoint.id) {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            (updatedMeasurements as any)[key] = num;
          }
        }
      });
      
      delete (updatedMeasurements as any)[selectedPoint.id];

      updateCustomerMeasurements(customer.id, updatedMeasurements);
      showToast(`${selectedPoint.name} measurement cleared`, 'success');
      setSelectedPoint(null);
    }
  };

  return (
    <PageLayout
      className={styles.pageGrid}
      header={<TopBar title="Customer Details" showBack />}
    >
        
        {/* LEFT COLUMN: Profile, Stats, Notes */}
        <div className={styles.leftColumn}>
          
          <div className={`${styles.card} ${styles.profileHeader}`}>
            <Avatar name={customer.fullName} size="lg" />
            <h2 className={styles.name}>{customer.fullName}</h2>
            <a href={getWhatsAppLink(customer.whatsappNumber)} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}>
              <FaWhatsapp size={16} /> {formatPhone(customer.whatsappNumber)}
            </a>
            <span className={styles.memberSince}>
              Customer since {formatMonthYear(customer.createdAt)}
            </span>
          </div>

          <div className={`${styles.card} ${styles.statsGrid}`}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{custOrders.length}</span>
              <span className={styles.statLabel}>Orders</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatCurrency(totalSpend)}</span>
              <span className={styles.statLabel}>Lifetime</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${totalOwed > 0 ? styles.gold : ''}`}>
                {formatCurrency(totalOwed)}
              </span>
              <span className={styles.statLabel}>Owed</span>
            </div>
          </div>

          <div className={`${styles.card} ${styles.relationshipSection}`}>
            <h3 className={styles.sectionTitle}>Relationship</h3>

            <div className={styles.relationshipRow}>
              <span className={styles.relationshipLabel}>
                {loyalty.tier === 'vip' ? <FaCrown /> : loyalty.tier === 'regular' ? <FaStar /> : <FaCircleUser />}
                Loyalty
              </span>
              <Badge variant={loyalty.tier === 'vip' ? 'gold' : 'default'}>{loyalty.label}</Badge>
            </div>

            <div className={styles.relationshipRow}>
              <span className={styles.relationshipLabel}><FaGift /> Birthday</span>
              {editingBirthday ? (
                <div className={styles.relationshipEditRow}>
                  <input
                    type="date"
                    value={birthdayInput}
                    onChange={(e) => setBirthdayInput(e.target.value)}
                    className={styles.relationshipDateInput}
                  />
                  <button type="button" onClick={handleSaveBirthday} className={styles.relationshipSaveBtn}>Save</button>
                </div>
              ) : (
                <button type="button" className={styles.relationshipValueBtn} onClick={() => setEditingBirthday(true)}>
                  {customer.dateOfBirth
                    ? new Date(customer.dateOfBirth).toLocaleDateString('en-NG', { month: 'long', day: 'numeric' })
                    : 'Add birthday'}
                </button>
              )}
            </div>

            {birthdaySoon && (
              <a
                href={getWhatsAppLink(customer.whatsappNumber, getBirthdayMessage(customer.fullName, shopName))}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.relationshipNudge}
              >
                <FaGift />
                {daysUntilBirthday === 0 ? "It's their birthday today!" : `Birthday in ${daysUntilBirthday} day${daysUntilBirthday === 1 ? '' : 's'}`} — Send wishes
              </a>
            )}

            <div className={styles.relationshipRow}>
              <span className={styles.relationshipLabel}><FaUserGroup /> Referred by</span>
              {editingReferrer ? (
                <div className={styles.relationshipEditRow}>
                  <Select
                    value={referrerInput}
                    onChange={(e) => setReferrerInput(e.target.value)}
                    options={referrerOptions}
                  />
                  <button type="button" onClick={handleSaveReferrer} className={styles.relationshipSaveBtn}>Save</button>
                </div>
              ) : (
                <button type="button" className={styles.relationshipValueBtn} onClick={() => setEditingReferrer(true)}>
                  {referredByCustomer ? referredByCustomer.fullName : 'Not set'}
                </button>
              )}
            </div>

            {referredCustomers.length > 0 && (
              <div className={styles.relationshipReferredList}>
                <span className={styles.relationshipLabel}>
                  Referred {referredCustomers.length} customer{referredCustomers.length === 1 ? '' : 's'}
                </span>
                <span className={styles.relationshipReferredNames}>
                  {referredCustomers.map((c) => c.fullName).join(', ')}
                </span>
              </div>
            )}

            {isStale && (
              <a
                href={getWhatsAppLink(customer.whatsappNumber, getReEngagementMessage(customer.fullName, shopName))}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.relationshipNudge}
              >
                <FaWhatsapp />
                Hasn't ordered in {daysSinceLastOrder} days — Send a nudge
              </a>
            )}
          </div>

          <div className={`${styles.card} ${styles.notesSection}`}>
            <h3 className={styles.sectionTitle}>Style &amp; Fit Notes</h3>
            <textarea
              className={styles.notesTextarea}
              placeholder="Persistent preferences, e.g. prefers loose sleeves, left shoulder slightly lower..."
              value={styleNotes}
              onChange={(e) => setStyleNotes(e.target.value)}
              onBlur={handleSaveNotes}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Measurements & Orders */}
        <div className={styles.rightColumn}>
          
          <div className={styles.card}>
            <div className={styles.measurementHeaderRow}>
              <h3 className={styles.sectionTitle}>Measurements</h3>
              <button type="button" className={styles.historyLinkBtn} onClick={handleOpenMeasurementHistory}>
                History
              </button>
            </div>
            <MeasurementAnatomy
              gender={customer.gender || 'female'}
              measurements={measurements} 
              selectedPointId={selectedPoint?.id} 
              onPointSelect={handlePointSelect} 
              onValueChange={handleMeasurementChange}
            />
          </div>

          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Order History</h3>
            <div className={styles.orderList}>
              {custOrders.map((o, i) => (
                <div 
                  key={o.id} 
                  className={styles.orderCard} 
                  style={{ animationDelay: `${i * 0.05}s`, cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(o)}
                >
                  <div className={styles.orderHeader}>
                    <div className={styles.orderMeta}>
                      <Badge variant={o.status.toLowerCase() as 'cutting' | 'sewing' | 'ready' | 'completed'} size="md">
                        {o.status}
                      </Badge>
                      <span className={styles.orderDate}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className={styles.orderDetails}>{truncateText(o.orderDetails, 120)}</p>
                  
                  <div className={styles.orderFinancials}>
                    <span className={styles.orderAmount}>{formatCurrency(o.totalBill)}</span>
                    {getBalanceOwed(o) > 0 && (
                      <span className={styles.orderBalance}>Owes {formatCurrency(getBalanceOwed(o))}</span>
                    )}
                  </div>
                </div>
              ))}
              {custOrders.length === 0 && (
                <p style={{ color: 'var(--sf-text-tertiary)', textAlign: 'center', padding: 'var(--sf-space-lg) 0' }}>
                  No orders found for this customer.
                </p>
              )}
            </div>
          </div>

        </div>

      <BottomSheet isOpen={!!selectedPoint} onClose={() => setSelectedPoint(null)}>
        <div style={{ padding: 'var(--sf-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-md)' }}>
          <div>
            <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>Selected point</p>
            <h3 style={{ fontSize: 'var(--sf-text-lg)', fontWeight: 'var(--sf-weight-semibold)', color: 'var(--sf-text-primary)', marginBottom: 'var(--sf-space-md)' }}>
              {selectedPoint?.name}
            </h3>
          </div>
          
          <Input 
            label="Measurement Value" 
            placeholder="e.g. 15 inches or 38 cm" 
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 'var(--sf-space-md)', marginTop: 'var(--sf-space-sm)' }}>
            <Button variant="ghost" fullWidth onClick={handleClearMeasurement}>
              Clear
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveMeasurement}>
              Save
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Order Detail Sheet */}
      <BottomSheet 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
      >
        {selectedOrder && (
          <OrderDetailSheet 
            order={orders.find(o => o.id === selectedOrder.id) || selectedOrder}
            customer={customer}
            userRole={isOwner ? 'Owner' : 'Staff'}
            onUpdatePayment={async (orderId, amount) => {
              const target = orders.find((o) => o.id === orderId);
              if (!target) return;
              const newDeposit = Math.min(target.totalBill, target.depositPaid + amount);
              const paymentRecord = {
                id: `pay-${Date.now()}`,
                amount,
                recordedBy: user?.uid || '',
                recordedByName: user?.name || 'Unknown',
                timestamp: new Date().toISOString(),
              };
              await updateOrder(orderId, {
                depositPaid: newDeposit,
                payments: [...(target.payments || []), paymentRecord],
              });
            }}
          />
        )}
      </BottomSheet>

      {/* Measurement History */}
      <BottomSheet isOpen={showMeasurementHistory} onClose={() => setShowMeasurementHistory(false)} title="Measurement History">
        {loadingHistory ? (
          <p className={styles.historyEmptyText}>Loading…</p>
        ) : measurementHistory.length === 0 ? (
          <p className={styles.historyEmptyText}>No past measurements on file yet — history is kept from the next edit onward.</p>
        ) : (
          <div className={styles.historyList}>
            {measurementHistory.map((entry) => (
              <div key={entry.id} className={styles.historyEntry}>
                <span className={styles.historyDate}>{formatDate(entry.recordedAt)}</span>
                <div className={styles.historyGrid}>
                  {Object.entries(entry.measurements)
                    .filter(([key, val]) => key !== 'notes' && val !== undefined && val !== '')
                    .map(([key, val]) => (
                      <div key={key} className={styles.historyItem}>
                        <span className={styles.historyLabel}>{formatMeasurementLabel(key)}</span>
                        <span className={styles.historyValue}>{val}&Prime;</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </PageLayout>
  );
}
