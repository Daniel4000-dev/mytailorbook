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
import { getStoredMockCustomers, saveMockCustomers, MOCK_ORDERS } from '@/lib/mockCustomers';
import { formatCurrency, formatPhone, getWhatsAppLink, truncateText, parseMeasurementValue, formatMeasurementsSummary } from '@/lib/formatters';
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
  const router = useRouter();
  const { isOwner, loading: authLoading } = useAuth();
  const { customers, orders, isLoaded, updateCustomerMeasurements, updateCustomerProfile, deleteCustomer, isDemoMode } = useData();

  if (authLoading || !isLoaded) {
    return (
      <PageLayout className={styles.page} header={<TopBar title="Customer Details" showBack onBack={() => router.push(ROUTES.customers)} />}>
        <CustomerDetailSkeleton />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack onBack={() => router.push(ROUTES.customers)} />}>
        <EmptyState icon={<Symbol name="person_off" />} title="Access Denied" />
      </PageLayout>
    );
  }

  const customer = customers.find((c) => c.id === id) || getStoredMockCustomers().find((c) => c.id === id);

  if (!customer) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack onBack={() => router.push(ROUTES.customers)} />}>
        <EmptyState icon={<Symbol name="person_off" />} title="Customer not found" />
      </PageLayout>
    );
  }

  const effectiveOrders = orders.length > 0 ? orders : MOCK_ORDERS;

  const handleUpdateMeasurements = async (customerId: string, newMeasurements: Measurements) => {
    if (customerId.startsWith('mock-')) {
      const all = getStoredMockCustomers();
      const updated = all.map((c) => (c.id === customerId ? { ...c, measurements: newMeasurements, measurementsUpdatedAt: new Date().toISOString() } : c));
      saveMockCustomers(updated);
      return;
    }
    return updateCustomerMeasurements(customerId, newMeasurements);
  };

  const handleUpdateProfile = async (customerId: string, updates: Partial<Customer>) => {
    if (customerId.startsWith('mock-')) {
      const all = getStoredMockCustomers();
      const updated = all.map((c) => (c.id === customerId ? { ...c, ...updates } : c));
      saveMockCustomers(updated);
      return;
    }
    return updateCustomerProfile(customerId, updates);
  };

  return (
    <CustomerProfileContent
      customer={customer}
      orders={effectiveOrders}
      updateCustomerMeasurements={handleUpdateMeasurements}
      updateCustomerProfile={handleUpdateProfile}
      deleteCustomer={deleteCustomer}
      isDemoMode={isDemoMode || customer.id.startsWith('mock-')}
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
  const [activeTab, setActiveTab] = useState<'measurements' | 'orders' | 'fabrics' | 'fits'>('measurements');
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

  const custOrders = useMemo(
    () =>
      orders
        .filter((o) => o.customerId === customer.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, customer.id]
  );
  const totalSpend = useMemo(() => custOrders.reduce((s, o) => s + o.totalBill, 0), [custOrders]);
  const totalOwed = useMemo(() => custOrders.reduce((s, o) => s + getBalanceOwed(o), 0), [custOrders]);

  const hasActiveOrder = useMemo(() => custOrders.some((o) => o.status !== 'Delivered'), [custOrders]);
  const hasReadyOrder = useMemo(() => custOrders.some((o) => o.status === 'Ready'), [custOrders]);

  useEffect(() => {
    custOrders.slice(0, 30).forEach((o) => router.prefetch(ROUTES.productionOrder(o.id)));
  }, [custOrders, router]);

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
    setMeasurements((prev) => ({
      ...prev,
      [pointId]: val,
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

  const handleWhatsAppMeasurements = () => {
    const points = customer.gender === 'male' ? MALE_MEASUREMENT_POINTS : FEMALE_MEASUREMENT_POINTS;
    const labels = Object.fromEntries(points.map((p) => [p.id, p.name]));
    const text = formatMeasurementsSummary({
      customerName: customer.fullName,
      gender: customer.gender,
      measurements,
      notes: notes || customer.measurementNotes,
      labels,
    });
    window.open(getWhatsAppLink(customer.whatsappNumber, text), '_blank');
  };

  const activePointsList = customer.gender === 'male' ? MALE_MEASUREMENT_POINTS : FEMALE_MEASUREMENT_POINTS;

  const commitCurrentPointValue = (valToCommit: string = currentValue) => {
    if (!selectedPoint) return;
    setMeasurements((prev) => ({
      ...prev,
      [selectedPoint.id]: valToCommit,
    }));

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

    const parsed = parseMeasurementValue(valToCommit);
    if (parsed !== null) {
      (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id] = parsed;
    } else {
      delete (updatedMeasurements as unknown as Record<string, number>)[selectedPoint.id];
    }

    updateCustomerMeasurements(customer.id, updatedMeasurements);
  };

  const handleSaveNotes = () => {
    updateCustomerProfile(customer.id, { measurementNotes: notes.trim() || undefined });
    showToast('Notes saved', 'success');
  };

  const handleSaveMeasurement = () => {
    if (selectedPoint) {
      commitCurrentPointValue();
      showToast(`${selectedPoint.name} measurement saved`, 'success');
      setSelectedPoint(null);
    }
  };

  const handleEnterKeyInModal = () => {
    if (!selectedPoint) return;
    commitCurrentPointValue();
    const currentIndex = activePointsList.findIndex((p) => p.id === selectedPoint.id);
    if (currentIndex >= 0 && currentIndex < activePointsList.length - 1) {
      const nextPoint = activePointsList[currentIndex + 1];
      setSelectedPoint(nextPoint);
      setCurrentValue(measurements[nextPoint.id] || '');
    } else {
      showToast('All measurements recorded', 'success');
      setSelectedPoint(null);
    }
  };

  const navigatePoint = (direction: -1 | 1) => {
    if (!selectedPoint) return;
    commitCurrentPointValue();

    const currentIndex = activePointsList.findIndex((p) => p.id === selectedPoint.id);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < activePointsList.length) {
      const nextPoint = activePointsList[nextIndex];
      setSelectedPoint(nextPoint);
      setCurrentValue(measurements[nextPoint.id] || '');
    }
  };

  const handleClearMeasurement = () => {
    if (selectedPoint) {
      setMeasurements((prev) => {
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
      showToast(uploaded.length > 1 ? `${uploaded.length} fabrics saved` : 'Fabric saved', 'success');
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
          onBack={() => router.push(ROUTES.customers)}
          rightAction={
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
            >
              <Symbol name="edit" size={20} />
            </button>
          }
        />
      }
    >
      <div className={styles.profileBar}>
        {/* ── 1. Executive Workshop Client Dossier ── */}
        <section className={styles.executiveCard}>
          <div className={styles.cardMainRow}>
            <div className={styles.avatarWrap}>
              <Avatar name={customer.fullName} size="xl" shape="circle" className={styles.mainAvatar} />
              {hasReadyOrder ? (
                <span className={styles.onlineBadge} title="Ready for pickup" />
              ) : hasActiveOrder ? (
                <span className={styles.activeBadge} title="Garment in production" />
              ) : null}
            </div>

            <div className={styles.profileDetails}>
              <div className={styles.nameActionRow}>
                <h2 className={styles.name}>{customer.fullName}</h2>
                <button
                  type="button"
                  className={styles.inlineEditBtn}
                  onClick={() => setEditOpen(true)}
                  aria-label="Edit customer profile"
                >
                  <Symbol name="edit" size={15} />
                </button>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.phoneText}>{formatPhone(customer.whatsappNumber)}</span>
                <button
                  type="button"
                  className={styles.copyPhoneBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(customer.whatsappNumber);
                    showToast('Phone number copied', 'info');
                  }}
                  title="Copy phone number"
                >
                  <Symbol name="content_copy" size={12} />
                </button>
                {customer.gender && (
                  <span className={styles.genderBadge}>
                    {customer.gender === 'female' ? 'Women' : 'Men'}
                  </span>
                )}
                {hasReadyOrder && <span className={styles.readyBadge}>Ready</span>}
                {hasActiveOrder && !hasReadyOrder && <span className={styles.inProdBadge}>In Production</span>}
              </div>

              {FEATURE_FLAGS.customerAddress && customer.address && (
                <div className={styles.customerAddress}>
                  <Symbol name="storefront" size={13} /> {customer.address}
                </div>
              )}

              {customer.wallet_balance !== undefined && customer.wallet_balance > 0 && (
                <div className={styles.storeCreditBadge}>
                  <Symbol name="account_balance_wallet" size={13} />
                  Store Credit: {formatCurrency(customer.wallet_balance)}
                </div>
              )}
            </div>
          </div>

          {/* Inset 3-Metric Executive Stats Tray */}
          <div className={styles.statsTray}>
            <div className={styles.statBox} onClick={() => setActiveTab('orders')} title="View orders">
              <span className={styles.statBoxVal}>{custOrders.length}</span>
              <span className={styles.statBoxLabel}>Total Orders</span>
            </div>
            <div className={styles.statBoxDivider} />
            <div className={styles.statBox} onClick={() => setActiveTab('orders')} title="View total spent">
              <span className={styles.statBoxVal}>{formatCurrency(totalSpend)}</span>
              <span className={styles.statBoxLabel}>Total Billed</span>
            </div>
            <div className={styles.statBoxDivider} />
            <div className={styles.statBox} onClick={() => setActiveTab('orders')} title="View balance due">
              <span className={`${styles.statBoxVal} ${totalOwed > 0 ? styles.warn : ''}`}>
                {totalOwed > 0 ? formatCurrency(totalOwed) : '₦0'}
              </span>
              <span className={`${styles.statBoxBadge} ${totalOwed > 0 ? styles.statBoxBadgeWarn : styles.statBoxBadgeClean}`}>
                {totalOwed > 0 ? 'Pending' : 'Settled'}
              </span>
            </div>
          </div>

          {/* Action Command Strip */}
          <div className={styles.actionCommandStrip}>
            <button
              type="button"
              className={styles.primaryOrderBtn}
              onClick={() => router.push(ROUTES.orderNewForCustomer(customer.id))}
            >
              <Symbol name="add_circle" size={17} />
              <span>New Order</span>
            </button>
            <button
              type="button"
              className={styles.secondaryActionBtn}
              onClick={() => router.push(`/quotes?customer=${customer.id}`)}
              title="Calculate quick quote"
            >
              <Symbol name="calculate" size={16} />
              <span>Quote</span>
            </button>
            <a
              href={getWhatsAppLink(
                customer.whatsappNumber,
                hasReadyOrder
                  ? `Hello ${customer.fullName}, your outfit is ready for pickup at our workshop! Looking forward to seeing you.`
                  : totalOwed > 0
                  ? `Hello ${customer.fullName}, friendly reminder regarding your pending balance of ${formatCurrency(totalOwed)}. Thank you!`
                  : `Hello ${customer.fullName}!`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryActionBtnWhatsApp}
              title="Message on WhatsApp"
            >
              <WhatsappIcon size={16} />
              <span>WhatsApp</span>
            </a>
            <a
              href={`tel:+${customer.whatsappNumber}`}
              className={styles.secondaryActionBtn}
              title="Call customer"
            >
              <Symbol name="call" size={16} />
              <span>Call</span>
            </a>
          </div>
        </section>

        {/* ── 2. Segmented Rail Tab Bar ── */}
        <div className={styles.segmentTabBar} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'measurements'}
            className={`${styles.segmentTabBtn} ${activeTab === 'measurements' ? styles.segmentTabActive : ''}`}
            onClick={() => setActiveTab('measurements')}
          >
            <Symbol name="straighten" size={15} />
            <span>Measurements</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'orders'}
            className={`${styles.segmentTabBtn} ${activeTab === 'orders' ? styles.segmentTabActive : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Symbol name="inventory_2" size={15} />
            <span>Orders {custOrders.length > 0 ? `(${custOrders.length})` : ''}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fabrics'}
            className={`${styles.segmentTabBtn} ${activeTab === 'fabrics' ? styles.segmentTabActive : ''}`}
            onClick={() => setActiveTab('fabrics')}
          >
            <Symbol name="texture" size={15} />
            <span>Fabrics {(customer.fabrics || []).length > 0 ? `(${(customer.fabrics || []).length})` : ''}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fits'}
            className={`${styles.segmentTabBtn} ${activeTab === 'fits' ? styles.segmentTabActive : ''}`}
            onClick={() => setActiveTab('fits')}
          >
            <Symbol name="checkroom" size={15} />
            <span>Style Fits {profileEntries.length > 0 ? `(${profileEntries.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: MEASUREMENTS ── */}
      {activeTab === 'measurements' && (
        <div className={styles.tabContent}>
          {/* Baseline Measurements Glance Tray */}
          <div className={styles.baselineTray}>
            <div className={styles.baselineItem}>
              <span className={styles.baselineLabel}>{customer.gender === 'female' ? 'Bust' : 'Chest'}</span>
              <span className={styles.baselineValue}>
                {measurements[customer.gender === 'female' ? 'bust' : 'chest'] ? `${measurements[customer.gender === 'female' ? 'bust' : 'chest']}"` : '--'}
              </span>
            </div>
            <div className={styles.baselineDivider} />
            <div className={styles.baselineItem}>
              <span className={styles.baselineLabel}>Waist</span>
              <span className={styles.baselineValue}>
                {measurements.waist ? `${measurements.waist}"` : '--'}
              </span>
            </div>
            <div className={styles.baselineDivider} />
            <div className={styles.baselineItem}>
              <span className={styles.baselineLabel}>Hips</span>
              <span className={styles.baselineValue}>
                {measurements.hips ? `${measurements.hips}"` : '--'}
              </span>
            </div>
            <div className={styles.baselineDivider} />
            <div className={styles.baselineItem}>
              <span className={styles.baselineLabel}>{customer.gender === 'female' ? 'Dress L.' : 'Trouser L.'}</span>
              <span className={styles.baselineValue}>
                {measurements[customer.gender === 'female' ? 'dressLength' : 'trouserLength'] ? `${measurements[customer.gender === 'female' ? 'dressLength' : 'trouserLength']}"` : '--'}
              </span>
            </div>
          </div>
          {/* Full-body reference profile */}
          <section className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Body Measurements</h3>
              <div className={styles.sectionActions}>
                <button
                  type="button"
                  className={styles.newBtn}
                  onClick={handleWhatsAppMeasurements}
                  title="Send measurements summary via WhatsApp"
                >
                  <WhatsappIcon size={14} /> WhatsApp
                </button>
                <button
                  type="button"
                  className={styles.newBtn}
                  onClick={handleCopyMeasurements}
                  title="Copy measurements summary to clipboard"
                >
                  <Symbol name="content_copy" size={14} /> Copy
                </button>
                <button
                  type="button"
                  className={styles.newBtn}
                  onClick={() => setHistorySheetOpen(true)}
                  title="View measurement history"
                >
                  <Symbol name="history" size={14} /> History
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
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Posture & Fit Notes</h3>
              <span className={styles.notesSaveHint}>Auto-saved</span>
            </div>
            {/* Quick Posture Tags */}
            <div className={styles.postureTagsTrack}>
              {(customer.gender === 'female'
                ? [
                    'Corset Fit',
                    'High Waist',
                    'Full Bust',
                    'Sloping Shoulder',
                    'Hourglass Fit',
                    'Wide Hips',
                    'Petite Fit',
                    'Modest Neckline',
                  ]
                : [
                    'Sloping Shoulder',
                    'Broad Shoulder',
                    'Erect Posture',
                    'Prominent Belly',
                    'Drop Crotch',
                    'Slim Fitted',
                    'Regular Fit',
                    'Extra Length',
                  ]
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.postureChip}
                  onClick={() => {
                    const nextNotes = notes.trim() ? `${notes.trim()}, ${tag}` : tag;
                    setNotes(nextNotes);
                    updateCustomerProfile(customer.id, { measurementNotes: nextNotes });
                    showToast(`Added "${tag}" to notes`, 'info');
                  }}
                >
                  + {tag}
                </button>
              ))}
            </div>
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

      {/* ── TAB 2: CUSTOMER FABRICS ── */}
      {activeTab === 'fabrics' && (
        <section className={styles.section}>
          <div className={styles.sectionTitleRow}>
            <h3 className={styles.sectionTitle}>Customer Fabrics</h3>
            <label className={styles.newBtn}>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFabricUpload}
                disabled={uploadingFabric}
              />
              <Symbol name="add_a_photo" size={16} /> {uploadingFabric ? 'Uploading...' : 'Add Photo'}
            </label>
          </div>

          {(customer.fabrics || []).length === 0 ? (
            <div className={styles.emptyHint}>
              <Symbol name="texture" className={styles.emptyHintIcon} />
              <span>No customer fabrics saved yet. Dropped off material or cloth? Add a picture here.</span>
            </div>
          ) : (
            <div className={styles.fabricGrid}>
              {(customer.fabrics || []).map((photo, i) => (
                <div key={i} className={styles.fabricGridItem}>
                  <Image
                    src={photo.url}
                    alt={`Fabric ${i + 1}`}
                    width={320}
                    height={320}
                    onClick={(e) => setLightbox({ src: photo.url, rect: e.currentTarget.getBoundingClientRect() })}
                    className={styles.fabricGridImg}
                  />
                  <button
                    type="button"
                    className={styles.photoRemoveBtn}
                    onClick={() => handleRemoveFabric(i)}
                    aria-label="Remove fabric"
                  >
                    <Symbol name="close" size={12} />
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
          {/* Payment Summary */}
          <section className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Payment Summary</h3>
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
                  <Symbol name="send" size={13} /> Remind via WhatsApp
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
                <span className={styles.statLabel}>Total Orders</span>
                <span className={styles.statValue}>{custOrders.length}</span>
              </div>
            </div>
          </section>

          {/* Action to create order */}
          <div className={styles.orderActionRow}>
            <Button variant="primary" fullWidth onClick={() => router.push(ROUTES.orderNewForCustomer(customer.id))}>
              <Symbol name="add_circle" size={18} /> Create New Order
            </Button>
          </div>

          {/* Recent Orders List */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Order History</h3>
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

          {/* Delete Customer */}
          <section className={styles.dangerZone}>
            <h3 className={styles.dangerZoneTitle}>Delete Customer</h3>
            <p className={styles.dangerZoneHint}>Permanently remove this customer record and their measurements.</p>
            <Button variant="danger" fullWidth onClick={() => setConfirmingDelete(true)}>
              <Symbol name="delete" /> Delete Customer
            </Button>
          </section>
        </div>
      )}

      {/* ── TAB 4: STYLE FITS ── */}
      {activeTab === 'fits' && (
        <div className={styles.tabContent}>
          <section className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>Saved Style Fits</h3>
              <button
                type="button"
                className={styles.newBtn}
                onClick={() => setStyleSheet({ open: true, style: null })}
              >
                <Symbol name="add" size={14} /> Add Style Fit
              </button>
            </div>

            <p className={styles.fitsDescription}>
              Save custom measurement adjustments for specific styles (Senator, Agbada, Kaftan, Suit) so you can quickly tailor future orders to perfection.
            </p>

            <div className={styles.fitsGrid}>
              {profileEntries.map(([styleName, profile]) => {
                const pointsCount = Object.keys(profile.measurements || {}).length;
                return (
                  <div
                    key={styleName}
                    className={styles.fitCard}
                    onClick={() => setStyleSheet({ open: true, style: styleName })}
                  >
                    <div className={styles.fitCardHeader}>
                      <div className={styles.fitCardIcon}>
                        <Symbol name="checkroom" size={20} />
                      </div>
                      <div className={styles.fitCardMeta}>
                        <h4 className={styles.fitCardTitle}>{styleName}</h4>
                        <span className={styles.fitCardSub}>{pointsCount} custom measurements</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.fitCardAction}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStyleSheet({ open: true, style: styleName });
                      }}
                    >
                      <Symbol name="edit" size={14} /> Edit Fit
                    </button>
                  </div>
                );
              })}

              {profileEntries.length === 0 && (
                <div className={styles.emptyHint}>
                  <Symbol name="checkroom" className={styles.emptyHintIcon} />
                  <span>No style fits saved yet. Tap &quot;Add Style Fit&quot; to save measurements for Senator, Agbada, Kaftan, or Suits.</span>
                </div>
              )}
            </div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>Measurement</p>
              <h3 style={{ fontSize: 'var(--sf-text-lg)', fontWeight: 'var(--sf-weight-semibold)', color: 'var(--sf-text-primary)' }}>
                {selectedPoint?.name}
              </h3>
            </div>
            {/* Previous and Next Navigation */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={styles.modalNavBtn}
                onClick={() => navigatePoint(-1)}
                disabled={activePointsList.findIndex((p) => p.id === selectedPoint?.id) <= 0}
                title="Previous measurement"
              >
                <Symbol name="arrow_back" size={16} />
              </button>
              <button
                type="button"
                className={styles.modalNavBtn}
                onClick={() => navigatePoint(1)}
                disabled={activePointsList.findIndex((p) => p.id === selectedPoint?.id) >= activePointsList.length - 1}
                title="Next measurement"
              >
                <Symbol name="arrow_forward" size={16} />
              </button>
            </div>
          </div>

          <Input
            label="Measurement Value (inches)"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 15 1/2 or 38.5"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnterKeyInModal();
              }
            }}
          />

          {/* Quick Fraction Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['1/4', '1/2', '3/4', '.25', '.5', '.75'].map((fraction) => (
              <button
                key={fraction}
                type="button"
                className={styles.fractionChip}
                onClick={() => {
                  const base = currentValue.trim();
                  const intPart = parseInt(base, 10);
                  if (!isNaN(intPart) && intPart > 0) {
                    if (fraction.startsWith('.')) {
                      setCurrentValue(`${intPart}${fraction}`);
                    } else {
                      setCurrentValue(`${intPart} ${fraction}`);
                    }
                  } else {
                    setCurrentValue(fraction.startsWith('.') ? `0${fraction}` : fraction);
                  }
                }}
              >
                +{fraction}&quot;
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--sf-space-md)', marginTop: 'var(--sf-space-sm)' }}>
            <Button variant="ghost" fullWidth onClick={handleClearMeasurement}>
              Clear
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveMeasurement}>
              Save Measurement
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
