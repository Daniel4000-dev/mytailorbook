'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaWhatsapp, FaUserSlash, FaLocationDot, FaTrash } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Input from '@/components/ui/Input/Input';
import Symbol from '@/components/ui/Symbol/Symbol';
import MeasurementAnatomy from '../_components/MeasurementAnatomy';
import EditCustomerSheet from '../_components/EditCustomerSheet';
import StyleProfileSheet from '../_components/StyleProfileSheet';
import { getStylePhotos } from '@/lib/style-photos';
import { GARMENT_STYLES } from '@/lib/constants';
import { formatCurrency, formatDate, getWhatsAppLink, truncateText, formatMonthYear } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import { deleteCustomerAction } from '@/app/actions';
import type { Measurements, Customer, Order } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import CustomerDetailSkeleton from './_components/CustomerDetailSkeleton';
import styles from './page.module.css';

interface Point {
  id: string;
  name: string;
  x: number;
  y: number;
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { isOwner } = useAuth();
  const { customers, orders, isLoaded, updateCustomerMeasurements } = useData();

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<FaUserSlash />} title="Access Denied" />
      </PageLayout>
    );
  }

  if (!isLoaded) {
    return (
      <PageLayout className={styles.page} header={<TopBar title="Customer Details" showBack />}>
        <CustomerDetailSkeleton />
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
      orders={orders}
      updateCustomerMeasurements={updateCustomerMeasurements}
    />
  );
}

function CustomerProfileContent({
  customer,
  orders,
  updateCustomerMeasurements,
}: {
  customer: Customer;
  orders: Order[];
  updateCustomerMeasurements: ReturnType<typeof useData>['updateCustomerMeasurements'];
}) {
  const { showToast } = useToast();
  const router = useRouter();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const customerOrderCount = useMemo(
    () => orders.filter((o) => o.customerId === customer.id).length,
    [orders, customer.id]
  );

  const handleDeleteCustomer = async () => {
    setDeletingCustomer(true);
    const { error } = await deleteCustomerAction(customer.id);
    if (error) {
      showToast(error, 'error');
      setDeletingCustomer(false);
      setConfirmingDelete(false);
      return;
    }
    showToast('Customer deleted', 'success');
    router.push('/customers');
  };

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

  const [notes, setNotes] = useState(customer.measurements?.notes || '');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [currentValue, setCurrentValue] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [styleSheet, setStyleSheet] = useState<{ open: boolean; style: string | null }>({ open: false, style: null });

  const id = customer.id;
  const custOrders = orders
    .filter((o) => o.customerId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalSpend = custOrders.reduce((s, o) => s + o.totalBill, 0);
  const totalOwed = custOrders.reduce((s, o) => s + getBalanceOwed(o), 0);

  // Order rows are plain divs (not <Link>), so warm their routes proactively
  // rather than waiting for the click.
  useEffect(() => {
    custOrders.slice(0, 30).forEach((o) => router.prefetch(`/production/${o.id}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id]);

  const stylePhotos = useMemo(() => getStylePhotos(GARMENT_STYLES), []);
  const profileEntries = useMemo(
    () =>
      Object.entries(customer.styleMeasurements || {}).sort(
        (a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime()
      ),
    [customer.styleMeasurements]
  );

  const handlePointSelect = (point: Point) => {
    setSelectedPoint(point);
    setCurrentValue(measurements[point.id] || '');
  };

  const handleMeasurementChange = (pointId: string, val: string) => {
    setMeasurements(prev => ({
      ...prev,
      [pointId]: val
    }));

    const updatedMeasurements: Measurements = {
      ...customer.measurements,
      notes: notes || undefined
    };

    const updatedRecord = { ...measurements, [pointId]: val };

    Object.entries(updatedRecord).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        (updatedMeasurements as unknown as Record<string, number>)[key] = num;
      }
    });

    const num = parseFloat(val);
    if (isNaN(num)) {
      delete (updatedMeasurements as unknown as Record<string, number>)[pointId];
    }

    updateCustomerMeasurements(customer.id, updatedMeasurements);
  };

  const handleSaveNotes = () => {
    const updatedMeasurements: Measurements = {
      ...customer.measurements,
      notes: notes || undefined
    };

    Object.entries(measurements).forEach(([key, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        (updatedMeasurements as unknown as Record<string, number>)[key] = num;
      }
    });

    updateCustomerMeasurements(customer.id, updatedMeasurements);
    showToast('Notes saved', 'success');
  };

  const handleSaveMeasurement = () => {
    if (selectedPoint) {
      const newVal = currentValue;
      setMeasurements(prev => ({
        ...prev,
        [selectedPoint.id]: newVal
      }));

      const updatedMeasurements: Measurements = {
        ...customer.measurements,
        notes: notes || undefined
      };

      Object.entries(measurements).forEach(([key, val]) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          (updatedMeasurements as unknown as Record<string, number>)[key] = num;
        }
      });

      const newNum = parseFloat(newVal);
      if (!isNaN(newNum)) {
        (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id] = newNum;
      } else {
        delete (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id];
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

      const updatedMeasurements: Measurements = {
        ...customer.measurements,
        notes: notes || undefined
      };

      Object.entries(measurements).forEach(([key, val]) => {
        if (key !== selectedPoint.id) {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            (updatedMeasurements as unknown as Record<string, number>)[key] = num;
          }
        }
      });

      delete (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id];

      updateCustomerMeasurements(customer.id, updatedMeasurements);
      showToast(`${selectedPoint.name} measurement cleared`, 'success');
      setSelectedPoint(null);
    }
  };

  return (
    <PageLayout
      className={styles.page}
      header={
        <TopBar
          title="Client Profile"
          showBack
          rightAction={
            <button type="button" className={styles.editBtn} onClick={() => setEditOpen(true)} aria-label="Edit profile">
              <Symbol name="edit" size={22} />
            </button>
          }
        />
      }
    >
      {/* Profile header */}
      <section className={styles.profileHeader}>
        <Avatar name={customer.fullName} size="lg" />
        <h2 className={styles.name}>{customer.fullName}</h2>
        {FEATURE_FLAGS.customerAddress && customer.address && (
          <span className={styles.customerAddress}>
            <FaLocationDot size={12} /> {customer.address}
          </span>
        )}

        <span className={styles.memberSince}>Customer since {formatMonthYear(customer.createdAt)}</span>

        {customer.preferredStyles && customer.preferredStyles.length > 0 && (
          <div className={styles.prefChips}>
            {customer.preferredStyles.map((s) => {
              const photoUrl = GARMENT_STYLES.find((g) => g.name === s)?.photoUrl;
              return (
                <span key={s} className={`${styles.prefChip} ${photoUrl ? '' : styles.prefChipNoPhoto}`}>
                  {photoUrl && <img src={photoUrl} alt="" className={styles.prefChipPhoto} />}
                  {s}
                </span>
              );
            })}
          </div>
        )}

        <div className={styles.quickActions}>
          <a href={`tel:+${customer.whatsappNumber}`} className={styles.quickActionBtn}>
            <Symbol name="call" size={22} />
            <span>Call</span>
          </a>
          <a
            href={getWhatsAppLink(customer.whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.quickActionBtn}
          >
            <FaWhatsapp size={20} />
            <span>WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Financial Summary */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Financial Summary</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Spent</span>
            <span className={styles.statValue}>{formatCurrency(totalSpend)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Pending Bal.</span>
            <span className={`${styles.statValue} ${totalOwed > 0 ? styles.warn : ''}`}>
              {formatCurrency(totalOwed)}
            </span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardWide}`}>
            <span className={styles.statLabel}>Lifetime Orders</span>
            <span className={styles.statValue}>{custOrders.length}</span>
          </div>
        </div>
      </section>

      {/* Measurement Profiles */}
      <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>Measurement Profiles</h3>
          <button type="button" className={styles.newBtn} onClick={() => setStyleSheet({ open: true, style: null })}>
            <Symbol name="add" size={18} /> NEW
          </button>
        </div>

        {profileEntries.length > 0 ? (
          <div className={styles.profileList}>
            {profileEntries.map(([styleName, profile]) => (
              <div key={styleName} className={styles.profileCard}>
                <div className={styles.profilePhoto}>
                  {stylePhotos[styleName] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stylePhotos[styleName]} alt="" />
                  ) : (
                    <Symbol name="checkroom" size={28} />
                  )}
                </div>
                <div className={styles.profileInfo}>
                  <h4>{styleName}</h4>
                  <p>Updated: {formatDate(profile.updatedAt)}</p>
                  <button
                    type="button"
                    className={styles.viewEditBtn}
                    onClick={() => setStyleSheet({ open: true, style: styleName })}
                  >
                    VIEW / EDIT
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHint}>No measurement profiles yet — tap + NEW to add one.</p>
        )}
      </section>

      {/* Full-body reference profile */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Full-Body Profile</h3>
        <MeasurementAnatomy
          gender={customer.gender || 'female'}
          measurements={measurements}
          selectedPointId={selectedPoint?.id}
          onPointSelect={handlePointSelect}
          onValueChange={handleMeasurementChange}
        />
      </section>

      {/* Notes */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Customer Notes</h3>
        <textarea
          className={styles.notesTextarea}
          placeholder="Add special requests, preferences, or fabric details here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
        />
      </section>

      {/* Order History */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent Orders</h3>
        {custOrders.length > 0 ? (
          <div className={styles.orderList}>
            {custOrders.map((o, i) => (
              <div
                key={o.id}
                className={styles.orderCard}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => router.push(`/production/${o.id}`)}
              >
                <div className={styles.orderHeader}>
                  <div className={styles.orderMeta}>
                    <h4 className={styles.orderTitle}>{truncateText(o.orderDetails, 40)}</h4>
                    <span className={styles.orderDate}>{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Badge variant={o.status.toLowerCase() as 'documented' | 'cutting' | 'sewing' | 'ready' | 'completed'} size="md">
                    {o.status}
                  </Badge>
                </div>

                <div className={styles.orderFinancials}>
                  <span className={styles.orderAmount}>{formatCurrency(o.totalBill)}</span>
                  {getBalanceOwed(o) > 0 && (
                    <span className={styles.orderBalance}>Owes {formatCurrency(getBalanceOwed(o))}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHint}>No orders yet for this customer.</p>
        )}
      </section>

      {/* Bottom actions */}
      <section className={styles.actionBar}>
        <Button variant="primary" fullWidth onClick={() => router.push(`/orders/new?customer=${customer.id}`)}>
          <Symbol name="add_circle" size={20} /> Create New Order
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setStyleSheet({ open: true, style: null })}>
          <Symbol name="straighten" size={20} /> Record Measurements
        </Button>
      </section>

      <section className={styles.actionBar}>
        <Button variant="danger" fullWidth onClick={() => setConfirmingDelete(true)}>
          <FaTrash /> Delete Customer
        </Button>
      </section>

      <ConfirmDialog
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete this customer?"
        description={
          customerOrderCount > 0
            ? `This customer has ${customerOrderCount} order${customerOrderCount === 1 ? '' : 's'} — deleting them will also permanently delete all ${customerOrderCount} order${customerOrderCount === 1 ? '' : 's'} and cannot be undone.`
            : 'This permanently deletes the customer and cannot be undone.'
        }
        confirmLabel="Delete Customer"
        loading={deletingCustomer}
      />

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

      <EditCustomerSheet isOpen={editOpen} onClose={() => setEditOpen(false)} customer={customer} />

      <StyleProfileSheet
        isOpen={styleSheet.open}
        onClose={() => setStyleSheet({ open: false, style: null })}
        customer={customer}
        initialStyle={styleSheet.style}
      />
    </PageLayout>
  );
}
