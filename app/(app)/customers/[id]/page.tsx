'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';
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
import PhotoLightbox from '@/components/ui/PhotoLightbox/PhotoLightbox';
import Input from '@/components/ui/Input/Input';
import Symbol from '@/components/ui/Symbol/Symbol';
import MeasurementAnatomy, { FEMALE_MEASUREMENT_POINTS, MALE_MEASUREMENT_POINTS } from '../_components/MeasurementAnatomy';
import MeasurementHistorySheet from '../_components/MeasurementHistorySheet';
import EditCustomerSheet from '../_components/EditCustomerSheet';
import StyleProfileSheet from '../_components/StyleProfileSheet';
import { getStylePhotos } from '@/lib/style-photos';
import { GARMENT_STYLES, STATUS_CONFIG } from '@/lib/constants';
import { formatCurrency, formatDate, formatPhone, getWhatsAppLink, truncateText, formatMonthYear, parseMeasurementValue, formatMeasurementsSummary } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import type { Measurements, Customer, Order, OrderPhoto } from '@/lib/types';
import { compressImage } from '@/lib/compressImage';
import { createClient } from '@/lib/supabase/client';
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
  const { isOwner, loading: authLoading } = useAuth();
  const { customers, orders, isLoaded, updateCustomerMeasurements, updateCustomerProfile, deleteCustomer, isDemoMode } = useData();

  if (authLoading || !isLoaded) {
    return (
      <PageLayout className={styles.page} header={<TopBar title="Customer Details" showBack />}>
        <CustomerDetailSkeleton />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<Symbol name="person_off" />} title="Access Denied" />
      </PageLayout>
    );
  }

  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<Symbol name="person_off" />} title="Customer not found" />
      </PageLayout>
    );
  }

  return (
    <CustomerProfileContent
      customer={customer}
      orders={orders}
      updateCustomerMeasurements={updateCustomerMeasurements}
      updateCustomerProfile={updateCustomerProfile}
      deleteCustomer={deleteCustomer}
      isDemoMode={isDemoMode}
    />
  );
}

function CustomerProfileContent({
  customer,
  orders,
  updateCustomerMeasurements,
  updateCustomerProfile,
  deleteCustomer,
  isDemoMode,
}: {
  customer: Customer;
  orders: Order[];
  updateCustomerMeasurements: ReturnType<typeof useData>['updateCustomerMeasurements'];
  updateCustomerProfile: ReturnType<typeof useData>['updateCustomerProfile'];
  deleteCustomer: ReturnType<typeof useData>['deleteCustomer'];
  isDemoMode?: boolean;
}) {
  const { showToast } = useToast();
  const router = useRouter();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState<'measurements' | 'fabrics' | 'orders'>('measurements');
  const customerOrderCount = useMemo(
    () => orders.filter((o) => o.customerId === customer.id).length,
    [orders, customer.id]
  );

  const handleDeleteCustomer = async () => {
    setDeletingCustomer(true);
    const { error } = await deleteCustomer(customer.id);
    if (error) {
      showToast(error, 'error');
      setDeletingCustomer(false);
      setConfirmingDelete(false);
      return;
    }
    showToast('Customer deleted', 'success');
    router.push(ROUTES.customers);
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

  const [notes, setNotes] = useState(customer.measurementNotes || '');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [currentValue, setCurrentValue] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [styleSheet, setStyleSheet] = useState<{ open: boolean; style: string | null }>({ open: false, style: null });
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [uploadingFabric, setUploadingFabric] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);

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
  };

  const handleMeasurementBlur = (pointId: string, val: string) => {
    const updatedMeasurements: Measurements = {
      ...customer.measurements,
    };

    const updatedRecord = { ...measurements, [pointId]: val };

    Object.entries(updatedRecord).forEach(([key, value]) => {
      const num = parseMeasurementValue(value);
      if (num !== null) {
        (updatedMeasurements as unknown as Record<string, number>)[key] = num;
      }
    });

    const parsed = parseMeasurementValue(val);
    if (parsed === null) {
      delete (updatedMeasurements as unknown as Record<string, number>)[pointId];
    } else {
      (updatedMeasurements as unknown as Record<string, number>)[pointId] = parsed;
    }

    updateCustomerMeasurements(customer.id, updatedMeasurements);
  };

  const handleCopyMeasurements = async () => {
    const points = customer.gender === 'male' ? MALE_MEASUREMENT_POINTS : FEMALE_MEASUREMENT_POINTS;
    const labels = Object.fromEntries(points.map((p) => [p.id, p.name]));
    const text = formatMeasurementsSummary({
      customerName: customer.fullName,
      gender: customer.gender,
      measurements,
      notes: notes || customer.measurementNotes,
      labels,
    });

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('Measurements copied to clipboard', 'success');
      } else {
        showToast('Clipboard not available', 'error');
      }
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const handleSaveNotes = () => {
    updateCustomerProfile(customer.id, { measurementNotes: notes.trim() || undefined });
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
      };

      Object.entries(measurements).forEach(([key, val]) => {
        const num = parseMeasurementValue(val);
        if (num !== null) {
          (updatedMeasurements as unknown as Record<string, number>)[key] = num;
        }
      });

      const parsed = parseMeasurementValue(newVal);
      if (parsed !== null) {
        (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id] = parsed;
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
      };

      Object.entries(measurements).forEach(([key, val]) => {
        if (key !== selectedPoint.id) {
          const num = parseMeasurementValue(val);
          if (num !== null) {
            (updatedMeasurements as unknown as Record<string, number>)[key] = num;
          }
        }
      });

      delete (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id];

      updateCustomerMeasurements(customer.id, updatedMeasurements);
      showToast(`${selectedPoint.name} measurement cleared`, 'info');
      setSelectedPoint(null);
    }
  };

  const uploadToStorage = async (rawFile: File, subdir: string) => {
    const file = await compressImage(rawFile);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${customer.shopId}/customers/${customer.id}/${subdir}${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('order-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;
  };

  const removeFromStorage = async (photo: OrderPhoto) => {
    const supabase = createClient();
    const path = photo.url.split('/order-photos/')[1];
    if (path) {
      await supabase.storage.from('order-photos').remove([path]);
    }
  };

  const handleFabricUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploadingFabric(true);
    try {
      const uploaded: OrderPhoto[] = [];
      for (const file of Array.from(files)) {
        let url: string;
        if (isDemoMode) {
          url = URL.createObjectURL(file);
        } else {
          url = await uploadToStorage(file, 'fabrics/');
        }
        uploaded.push({ url, stage: 'Documented', uploadedAt: new Date().toISOString() });
      }
      await updateCustomerProfile(customer.id, { fabrics: [...(customer.fabrics || []), ...uploaded] });
      showToast(uploaded.length > 1 ? `${uploaded.length} fabrics added to stash` : 'Fabric added to stash', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload fabric', 'error');
    } finally {
      setUploadingFabric(false);
      e.target.value = '';
    }
  };

  const handleRemoveFabric = async (index: number) => {
    const removed = (customer.fabrics || [])[index];
    await updateCustomerProfile(customer.id, { fabrics: (customer.fabrics || []).filter((_, i) => i !== index) });
    if (!isDemoMode && removed && removed.url) await removeFromStorage(removed);
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
      {/* Desktop: identity + quick stats span the full width as one band up
         top, then the record detail (styles/measurements/notes/orders)
         splits into two columns below it. Mobile: all wrappers are plain
         blocks, so nothing about the visual order changes there. */}
      <div className={styles.profileBar}>
      {/* Profile header */}
      <section className={styles.profileHeader}>
        <Avatar name={customer.fullName} size="xl" shape="squircle" />
        <h2 className={styles.name}>{customer.fullName}</h2>
        <div className={styles.metaRow}>
          <span style={{ fontSize: '13px', color: 'var(--sf-text-secondary)', fontWeight: 500 }}>
            {formatPhone(customer.whatsappNumber)}
          </span>
          <button
            type="button"
            className={styles.genderTag}
            onClick={() => setEditOpen(true)}
            title="Tap to edit gender / profile"
          >
            {customer.gender}
          </button>
        </div>

        {FEATURE_FLAGS.customerAddress && customer.address && (
          <span className={styles.customerAddress}>
            <Symbol name="location_on" size={12} /> {customer.address}
          </span>
        )}

        {customer.birthdate && (
          <span className={styles.customerAddress}>
            <Symbol name="cake" size={12} /> Born {customer.birthdate}
          </span>
        )}

        {customer.wallet_balance !== undefined && customer.wallet_balance > 0 && (
          <div className={styles.storeCreditBadge}>
            <Symbol name="account_balance_wallet" size={14} />
            Store Credit: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(customer.wallet_balance)}
          </div>
        )}

        {/* Apple Contacts Action Strip */}
        <div className={styles.appleActionStrip}>
          <button
            type="button"
            className={styles.applePrimaryActionBtn}
            onClick={() => router.push(ROUTES.orderNewForCustomer(customer.id))}
          >
            <Symbol name="add_circle" size={18} />
            <span>New Order</span>
          </button>
          <a
            href={getWhatsAppLink(customer.whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.appleSecondaryActionBtn}
          >
            <WhatsappIcon size={18} />
            <span>WhatsApp</span>
          </a>
          <a href={`tel:+${customer.whatsappNumber}`} className={styles.appleSecondaryActionBtn}>
            <Symbol name="call" size={18} />
            <span>Call</span>
          </a>
        </div>

        {/* Instagram-Style Metric Strip */}
        <div className={styles.metricStrip}>
          <div className={styles.metricItem} onClick={() => setActiveTab('orders')}>
            <span className={styles.metricVal}>{custOrders.length}</span>
            <span className={styles.metricLabel}>Orders</span>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metricItem} onClick={() => setActiveTab('orders')}>
            <span className={styles.metricVal}>{formatCurrency(totalSpend)}</span>
            <span className={styles.metricLabel}>Total Spent</span>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metricItem} onClick={() => setActiveTab('orders')}>
            <span className={`${styles.metricVal} ${totalOwed > 0 ? styles.warn : ''}`}>
              {formatCurrency(totalOwed)}
            </span>
            <span className={styles.metricLabel}>
              {totalOwed > 0 ? 'Balance Due' : 'Zero Debt'}
            </span>
          </div>
        </div>

        {/* iOS Segmented Control */}
        <div className={styles.segmentedControl}>
          <button
            type="button"
            className={`${styles.segmentBtn} ${activeTab === 'measurements' ? styles.segmentActive : ''}`}
            onClick={() => setActiveTab('measurements')}
          >
            <Symbol name="straighten" size={16} />
            <span>Fit & Styles</span>
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${activeTab === 'fabrics' ? styles.segmentActive : ''}`}
            onClick={() => setActiveTab('fabrics')}
          >
            <Symbol name="texture" size={16} />
            <span>Fabric Stash ({(customer.fabrics || []).length})</span>
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${activeTab === 'orders' ? styles.segmentActive : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Symbol name="inventory_2" size={16} />
            <span>Orders ({custOrders.length})</span>
          </button>
        </div>
      </section>
      </div>

      {/* ── TAB 1: MEASUREMENTS & STYLES ── */}
      {activeTab === 'measurements' && (
        <div className={styles.tabContent}>
          {/* Garment Style Profiles (Instagram Highlights Carousel) */}
          <section className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Garment Style Profiles</h3>
              <button type="button" className={styles.newBtn} onClick={() => setStyleSheet({ open: true, style: null })}>
                <Symbol name="add" size={18} /> NEW
              </button>
            </div>

            <div className={styles.highlightsCarousel}>
              {profileEntries.map(([styleName, profile]) => {
                const pointsCount = Object.keys(profile.measurements || {}).length;
                return (
                  <button
                    key={styleName}
                    type="button"
                    className={styles.highlightCard}
                    onClick={() => setStyleSheet({ open: true, style: styleName })}
                  >
                    <div className={styles.highlightPhotoWrap}>
                      {stylePhotos[styleName] ? (
                        <Image src={stylePhotos[styleName]} alt="" width={72} height={72} className={styles.highlightImg} />
                      ) : (
                        <div className={styles.highlightPlaceholder}>
                          <Symbol name="checkroom" size={28} />
                        </div>
                      )}
                    </div>
                    <span className={styles.highlightTitle}>{styleName}</span>
                    <span className={styles.highlightSub}>{pointsCount} pts</span>
                  </button>
                );
              })}
              <button
                type="button"
                className={styles.highlightCard}
                onClick={() => setStyleSheet({ open: true, style: null })}
              >
                <div className={`${styles.highlightPhotoWrap} ${styles.addHighlightCard}`}>
                  <Symbol name="add" size={24} style={{ color: 'var(--sf-brand-indigo)' }} />
                </div>
                <span className={styles.highlightTitle}>+ Add Style</span>
                <span className={styles.highlightSub}>New Fit</span>
              </button>
            </div>
          </section>

          {/* Full-body reference profile */}
          <section className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Full-Body Anatomy</h3>
              <div className={styles.sectionActions}>
                <button
                  type="button"
                  className={styles.newBtn}
                  onClick={handleCopyMeasurements}
                  title="Copy measurements summary to clipboard"
                >
                  <Symbol name="content_copy" size={16} /> COPY
                </button>
                <button type="button" className={styles.newBtn} onClick={() => setHistorySheetOpen(true)}>
                  <Symbol name="history" size={16} /> HISTORY
                </button>
              </div>
            </div>
            <MeasurementAnatomy
              gender={customer.gender || 'female'}
              measurements={measurements}
              selectedPointId={selectedPoint?.id}
              onPointSelect={handlePointSelect}
              onValueChange={handleMeasurementChange}
              onValueBlur={handleMeasurementBlur}
            />
          </section>

          {/* Posture & Fitting Notes */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Posture & Fit Notes</h3>
            <textarea
              className={styles.notesTextarea}
              placeholder="Add posture quirks, preferences, or fitting details here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
            />
          </section>
        </div>
      )}

      {/* ── TAB 2: FABRIC STASH ── */}
      {activeTab === 'fabrics' && (
        <section className={styles.section}>
          <div className={styles.sectionTitleRow}>
            <h3 className={styles.sectionTitle}>Fabric Stash</h3>
            <label className={styles.newBtn}>
              <input type="file" accept="image/*" multiple hidden onChange={handleFabricUpload} disabled={uploadingFabric} />
              <Symbol name="add_a_photo" size={18} /> {uploadingFabric ? 'UPLOADING...' : 'SNAP CLOTH'}
            </label>
          </div>
          
          {(customer.fabrics || []).length === 0 ? (
            <div className={styles.emptyHint}>
              <Symbol name="texture" className={styles.emptyHintIcon} />
              <span>No fabrics stashed. Dropped off Aso Ebi or cloth? Snap a picture here.</span>
            </div>
          ) : (
            <div className={styles.inspoGrid}>
              {(customer.fabrics || []).map((photo, i) => (
                <div key={i} className={styles.inspoThumb}>
                  <Image
                    src={photo.url}
                    alt={`Fabric ${i + 1}`}
                    width={400}
                    height={400}
                    onClick={(e) => setLightbox({ src: photo.url, rect: e.currentTarget.getBoundingClientRect() })}
                    style={{ cursor: 'zoom-in', objectFit: 'cover', width: '100%', height: '100%', borderRadius: 'var(--sf-radius-md)' }}
                  />
                  <button type="button" className={styles.photoRemoveBtn} onClick={() => handleRemoveFabric(i)} aria-label="Remove fabric">
                    <Symbol name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── TAB 3: ORDERS & FINANCIALS ── */}
      {activeTab === 'orders' && (
        <div className={styles.tabContent}>
          {/* Financial Summary */}
          <section className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Financial Health</h3>
              {totalOwed > 0 && customer.whatsappNumber && (
                <a
                  href={getWhatsAppLink(
                    customer.whatsappNumber,
                    `Hello ${customer.fullName}, friendly reminder from your tailor regarding your pending balance of ${formatCurrency(totalOwed)}. Thank you!`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.debtReminderBtn}
                  title="Send WhatsApp payment reminder"
                >
                  <Symbol name="send" size={14} /> Remind via WhatsApp
                </a>
              )}
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Spent</span>
                <span className={styles.statValue}>{formatCurrency(totalSpend)}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Pending Balance</span>
                <span className={`${styles.statValue} ${totalOwed > 0 ? styles.warn : ''}`}>
                  {formatCurrency(totalOwed)}
                </span>
              </div>
              <div className={`${styles.statCard} ${styles.statCardWide}`}>
                <span className={styles.statLabel}>Lifetime Outfits</span>
                <span className={styles.statValue}>{custOrders.length}</span>
              </div>
            </div>
          </section>

          {/* Action to create order */}
          <div className={styles.orderActionRow}>
            <Button variant="primary" fullWidth onClick={() => router.push(ROUTES.orderNewForCustomer(customer.id))}>
              <Symbol name="add_circle" size={20} /> Create New Order
            </Button>
          </div>

          {/* Recent Orders List */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Production History</h3>
            {custOrders.length > 0 ? (
              <div className={styles.orderList}>
                {custOrders.map((o, i) => (
                  <div
                    key={o.id}
                    className={styles.orderCard}
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => router.push(ROUTES.productionOrder(o.id))}
                  >
                    <div className={styles.orderHeader}>
                      <div className={styles.orderMeta}>
                        <h4 className={styles.orderTitle}>{truncateText(o.orderDetails, 40)}</h4>
                        <span className={styles.orderDate}>{new Date(o.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Badge variant={o.status.toLowerCase() as 'documented' | 'cutting' | 'sewing' | 'ready' | 'delivered'} size="md">
                        {STATUS_CONFIG[o.status].label}
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
              <div className={styles.emptyHint}>
                <Symbol name="inventory_2" className={styles.emptyHintIcon} />
                <span>No orders recorded yet. Tap Create New Order to begin.</span>
              </div>
            )}
          </section>

          {/* Danger Zone */}
          <section className={styles.dangerZone}>
            <h3 className={styles.dangerZoneTitle}>Danger Zone</h3>
            <p className={styles.dangerZoneHint}>This action is permanent and cannot be undone.</p>
            <Button variant="danger" fullWidth onClick={() => setConfirmingDelete(true)}>
              <Symbol name="delete" /> Delete Customer
            </Button>
          </section>
        </div>
      )}

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

      <BottomSheet isOpen={!!selectedPoint} onClose={() => setSelectedPoint(null)} variant="modal">
        <div style={{ padding: 'var(--sf-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-md)' }}>
          <div>
            <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>Selected point</p>
            <h3 style={{ fontSize: 'var(--sf-text-lg)', fontWeight: 'var(--sf-weight-semibold)', color: 'var(--sf-text-primary)', marginBottom: 'var(--sf-space-md)' }}>
              {selectedPoint?.name}
            </h3>
          </div>

          <Input
            label="Measurement Value"
            placeholder="e.g. 15 1/2 or 38.5"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveMeasurement();
              }
            }}
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
      
      <MeasurementHistorySheet
        isOpen={historySheetOpen}
        onClose={() => setHistorySheetOpen(false)}
        customer={customer}
      />

      {lightbox && (
        <PhotoLightbox
          src={lightbox.src}
          originRect={lightbox.rect}
          onClose={() => setLightbox(null)}
        />
      )}
    </PageLayout>
  );
}
