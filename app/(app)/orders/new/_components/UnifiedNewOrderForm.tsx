'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { formatCurrency, formatNumber, formatPhone, getCurrencySymbol, getWhatsAppLink, normalizePhone } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import { GARMENT_STYLES, STYLE_MEASUREMENTS, type StyleMeasurePoint } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import type { Customer, Order, OrderStatus, Priority } from '@/lib/types';
import styles from './UnifiedNewOrderForm.module.css';

const DEFAULT_POINTS: StyleMeasurePoint[] = [
  { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 0, gy: 0 },
  { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across back', gx: 0, gy: 0 },
  { key: 'chest', label: 'Chest / Bust', hint: 'Fullest part, arms down', gx: 0, gy: 0 },
  { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 0, gy: 0 },
  { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 0, gy: 0 },
  { key: 'shirtLength', label: 'Top / Shirt Length', hint: 'Shoulder to top hem', gx: 0, gy: 0 },
  { key: 'trouserLength', label: 'Trouser / Dress Length', hint: 'Waist or shoulder to hem', gx: 0, gy: 0 },
  { key: 'hips', label: 'Hips', hint: 'Widest point around seat', gx: 0, gy: 0 },
  { key: 'thigh', label: 'Thigh', hint: 'Widest part of upper leg', gx: 0, gy: 0 },
  { key: 'ankle', label: 'Ankle / Bottom', hint: 'Around the bottom hem', gx: 0, gy: 0 },
];

export default function UnifiedNewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    customers,
    orders,
    staffMembers,
    currentShop,
    isLoaded,
    addOrderBatch,
    addCustomer,
    updateCustomerStyleProfile,
    updateCustomerMeasurements,
    updateCustomerProfile,
  } = useData();
  const { showToast } = useToast();

  const currencySymbol = getCurrencySymbol(currentShop?.currency || 'NGN');

  // ── 1. Client State ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showInlineNewCustomer, setShowInlineNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerGender, setNewCustomerGender] = useState<'male' | 'female'>('male');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Pre-select if customer query param is passed
  useEffect(() => {
    const custId = searchParams.get('customer');
    if (custId && customers.length > 0 && !selectedCustomer) {
      const match = customers.find((c) => c.id === custId);
      if (match) setSelectedCustomer(match);
    }
  }, [searchParams, customers, selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) => c.fullName.toLowerCase().includes(q) || c.whatsappNumber.includes(q)
    ).slice(0, 6);
  }, [customers, customerSearch]);

  const customerPastOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter((o) => o.customerId === selectedCustomer.id);
  }, [orders, selectedCustomer]);

  // ── 2. Garment & Style State ──
  const allStyles = useMemo(() => {
    const standard = GARMENT_STYLES.map((s) => ({
      name: s.name,
      subtitle: s.subtitle,
      gender: s.gender,
      photoUrl: s.photoUrl,
    }));
    const custom = (currentShop?.customStyles || []).map((s) => ({
      name: s.name,
      subtitle: 'Custom Studio Style',
      gender: s.gender || 'male',
      photoUrl: s.photoUrl,
    }));
    return [...standard, ...custom];
  }, [currentShop?.customStyles]);

  const [selectedStyle, setSelectedStyle] = useState<string>('Senator');

  // ── 3. Measurements State ──
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [isFitLoaded, setIsFitLoaded] = useState(false);
  const [showTweakMeasurements, setShowTweakMeasurements] = useState(false);

  // Active spec for current style
  const currentSpecPoints = useMemo<StyleMeasurePoint[]>(() => {
    const spec = STYLE_MEASUREMENTS[selectedStyle];
    if (spec && spec.points.length > 0) return spec.points;
    const customMatch = currentShop?.customStyles?.find((cs) => cs.name === selectedStyle);
    if (customMatch && customMatch.measurementFields && customMatch.measurementFields.length > 0) {
      return customMatch.measurementFields.map((f) => ({
        key: f.id,
        label: f.label,
        hint: f.label,
        gx: 0,
        gy: 0,
      }));
    }
    return DEFAULT_POINTS;
  }, [selectedStyle, currentShop?.customStyles]);

  // Auto-load repeat client measurements when client or style changes
  useEffect(() => {
    if (!selectedCustomer) {
      setMeasures({});
      setIsFitLoaded(false);
      setMeasurementNotes('');
      return;
    }

    // 1. Check style-specific profile
    const styleProfile = selectedCustomer.styleMeasurements?.[selectedStyle]?.measurements;
    // 2. Check previous order of the same style
    const pastSameOrder = orders
      .filter((o) => o.customerId === selectedCustomer.id && o.styleName === selectedStyle && o.measurements)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    // 3. Fallback to customer general body measurements
    const bodyMeasurements = selectedCustomer.measurements;

    const source = styleProfile || pastSameOrder?.measurements || bodyMeasurements;

    if (source && Object.keys(source).length > 0) {
      const stringified: Record<string, string> = {};
      for (const [k, v] of Object.entries(source)) {
        if (v !== undefined && v !== null) {
          const num = typeof v === 'number' ? v : parseFloat(String(v));
          if (!isNaN(num) && num > 0) stringified[k] = String(num);
        }
      }
      setMeasures(stringified);
      setIsFitLoaded(true);
      setShowTweakMeasurements(false);
    } else {
      setMeasures({});
      setIsFitLoaded(false);
      setShowTweakMeasurements(true);
    }

    if (selectedCustomer.measurementNotes) {
      setMeasurementNotes(selectedCustomer.measurementNotes);
    }
  }, [selectedCustomer, selectedStyle, orders]);

  const handleMeasureChange = (key: string, val: string) => {
    setMeasures((prev) => ({ ...prev, [key]: val }));
  };

  // ── 4. Photos State (Fabric + Style Reference) ──
  const [fabricImage, setFabricImage] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [uploadingFabric, setUploadingFabric] = useState(false);
  const [uploadingStyleRef, setUploadingStyleRef] = useState(false);

  const handlePhotoUpload = async (file: File, type: 'fabric' | 'styleRef') => {
    if (!currentShop?.id) return;
    const isFabric = type === 'fabric';
    if (isFabric) setUploadingFabric(true);
    else setUploadingStyleRef(true);

    try {
      const compressed = await compressImage(file, { maxDimension: 1200 });
      const supabase = createClient();
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/orders/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('order-photos')
        .upload(path, compressed, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(uploadError.message);
      const url = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;

      if (isFabric) setFabricImage(url);
      else setStyleReferenceImage(url);
      showToast(`${isFabric ? 'Fabric' : 'Style'} photo uploaded`, 'success');
    } catch (err) {
      showToast('Could not upload photo. Please try again.', 'error');
    } finally {
      if (isFabric) setUploadingFabric(false);
      else setUploadingStyleRef(false);
    }
  };

  // ── 5. Financials & Delivery Schedule ──
  const [totalBill, setTotalBill] = useState('');
  const [depositPaid, setDepositPaid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Live balance calculation
  const numericTotal = parseInt(totalBill.replace(/,/g, '')) || 0;
  const numericDeposit = parseInt(depositPaid.replace(/,/g, '')) || 0;
  const numericBalance = Math.max(0, numericTotal - numericDeposit);

  // Quick Due Date Presets
  const setQuickDate = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
  };

  // ── 6. Order Submission & WhatsApp Receipt ──
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [receiptSheetOpen, setReceiptSheetOpen] = useState(false);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      showToast('Please enter the customer name', 'error');
      return;
    }
    if (!newCustomerPhone.trim()) {
      showToast('Please enter a WhatsApp number', 'error');
      return;
    }

    setSavingCustomer(true);
    try {
      const created = await addCustomer({
        fullName: newCustomerName.trim(),
        whatsappNumber: newCustomerPhone.trim(),
        gender: newCustomerGender,
      });
      setSelectedCustomer(created);
      setShowInlineNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      showToast(`Added client ${created.fullName}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      showToast('Please select or add a client first', 'error');
      return;
    }
    if (!totalBill || numericTotal <= 0) {
      showToast('Please enter the total price for this garment', 'error');
      return;
    }
    if (!dueDate) {
      showToast('Please choose a delivery / ready date', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const parsedNumericMeasures: Record<string, number> = {};
      for (const [k, v] of Object.entries(measures)) {
        const parsed = parseFloat(v);
        if (!isNaN(parsed) && parsed > 0) parsedNumericMeasures[k] = parsed;
      }

      const formattedDueDate = dueDate.includes('T') ? dueDate : `${dueDate}T12:00:00.000Z`;
      const inspoList: string[] = [];
      if (styleReferenceImage) inspoList.push(styleReferenceImage);

      const orderPayload: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'> = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        orderDetails: orderNotes.trim() || `${selectedStyle} for ${selectedCustomer.fullName}`,
        totalBill: numericTotal,
        depositPaid: numericDeposit,
        status: 'Documented',
        assignedTo: assignedStaff || undefined,
        assignedToName: staffMembers.find((s) => s.uid === assignedStaff)?.name,
        dueDate: formattedDueDate,
        priority,
        measurements: parsedNumericMeasures,
        images: fabricImage
          ? [{ url: fabricImage, stage: 'Documented' as const, uploadedAt: new Date().toISOString() }]
          : [],
        inspirationImages: inspoList,
        styleName: selectedStyle,
        materialSuppliedBy: 'customer',
        materialCost: 0,
        otherCosts: 0,
        statusHistory: [
          {
            from: null,
            to: 'Documented',
            changedBy: user?.uid || 'unknown',
            changedByName: user?.name || 'Tailor',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const createdOrders = await addOrderBatch([orderPayload]);
      const created = createdOrders?.[0] || {
        ...orderPayload,
        id: crypto.randomUUID(),
        shopId: currentShop?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update customer style measurements if changed
      if (Object.keys(parsedNumericMeasures).length > 0) {
        await updateCustomerStyleProfile(selectedCustomer.id, selectedStyle, parsedNumericMeasures).catch(() => {});
        await updateCustomerMeasurements(selectedCustomer.id, parsedNumericMeasures).catch(() => {});
      }
      if (measurementNotes.trim() && measurementNotes !== selectedCustomer.measurementNotes) {
        await updateCustomerProfile(selectedCustomer.id, { measurementNotes: measurementNotes.trim() }).catch(() => {});
      }

      setCompletedOrder(created as Order);
      setReceiptSheetOpen(true);
      showToast('Order created successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppReceiptText = () => {
    if (!completedOrder || !selectedCustomer) return '';
    const shopName = currentShop?.name || 'Our Studio';
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}${ROUTES.track(completedOrder.id)}` : '';
    const formattedDate = completedOrder.dueDate
      ? new Date(completedOrder.dueDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'To be confirmed';

    return [
      `Hello ${selectedCustomer.fullName.split(' ')[0]}! ✂️`,
      `Thank you for placing your order with *${shopName}*.`,
      ``,
      `📋 *Order Summary:*`,
      `• *Garment:* ${completedOrder.styleName || selectedStyle}`,
      `• *Total:* ${currencySymbol}${formatNumber(completedOrder.totalBill)}`,
      `• *Deposit Paid:* ${currencySymbol}${formatNumber(completedOrder.depositPaid)}`,
      `• *Balance Due:* ${currencySymbol}${formatNumber(Math.max(0, completedOrder.totalBill - completedOrder.depositPaid))}`,
      `• *Ready By:* ${formattedDate}`,
      ``,
      `Track your outfit's progress here:`,
      trackingUrl,
      ``,
      `Thank you for your business!`,
    ].join('\n');
  };

  return (
    <PageLayout
      width="narrow"
      header={
        <TopBar
          title="New Order"
          subtitle="Clean, progressive order intake"
          showBack
          onBack={() => router.push(ROUTES.production)}
        />
      }
    >
      <div className={styles.container}>
        {/* ── CARD 1: CLIENT SELECTION ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>1</span>
              <div>
                <h2 className={styles.cardTitle}>Client</h2>
                <p className={styles.cardSubtitle}>Select client or register a walk-in</p>
              </div>
            </div>
            {selectedCustomer && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
              >
                Change
              </button>
            )}
          </div>

          {!selectedCustomer ? (
            <div>
              {!showInlineNewCustomer ? (
                <>
                  <div className={styles.searchBox}>
                    <Symbol name="search" size={20} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search by client name or phone…"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch('')}
                        className={styles.clearSearchBtn}
                      >
                        <Symbol name="close" size={16} />
                      </button>
                    )}
                  </div>

                  <div className={styles.customerList}>
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        className={styles.customerRow}
                        onClick={() => setSelectedCustomer(cust)}
                      >
                        <div className={styles.avatar}>
                          {cust.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.customerDetails}>
                          <span className={styles.customerName}>{cust.fullName}</span>
                          <span className={styles.customerPhone}>
                            {formatPhone(cust.whatsappNumber)}
                          </span>
                        </div>
                        <Symbol name="arrow_forward_ios" size={14} className={styles.rowArrow} />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.newClientBanner}
                    onClick={() => setShowInlineNewCustomer(true)}
                  >
                    <Symbol name="person_add" size={20} />
                    <span>New Walk-in Client? Register in 10 seconds</span>
                  </button>
                </>
              ) : (
                <form onSubmit={handleCreateCustomer} className={styles.inlineForm}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Adebayo Adeleke"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>WhatsApp Phone</label>
                    <input
                      type="tel"
                      className={styles.input}
                      placeholder="e.g. 08012345678"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Gender</label>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newCustomerGender === 'male' ? styles.segActive : ''}`}
                        onClick={() => setNewCustomerGender('male')}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newCustomerGender === 'female' ? styles.segActive : ''}`}
                        onClick={() => setNewCustomerGender('female')}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setShowInlineNewCustomer(false)}
                      disabled={savingCustomer}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryInlineBtn}
                      disabled={savingCustomer}
                    >
                      {savingCustomer ? 'Adding…' : 'Add Client & Select'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className={styles.selectedClientCard}>
              <div className={styles.selectedClientHeader}>
                <div className={styles.avatarLarge}>
                  {selectedCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className={styles.selectedClientName}>{selectedCustomer.fullName}</h3>
                  <p className={styles.selectedClientPhone}>
                    {formatPhone(selectedCustomer.whatsappNumber)}
                  </p>
                  <div className={styles.clientBadges}>
                    {customerPastOrders.length > 0 ? (
                      <span className={styles.repeatBadge}>
                        <Symbol name="check_circle" size={14} /> Repeat Client ({customerPastOrders.length} orders)
                      </span>
                    ) : (
                      <span className={styles.newBadge}>First Order</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── CARD 2: GARMENT & STYLE ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>2</span>
              <div>
                <h2 className={styles.cardTitle}>Garment & Style</h2>
                <p className={styles.cardSubtitle}>Select garment type</p>
              </div>
            </div>
            <span className={styles.activeStyleTag}>{selectedStyle}</span>
          </div>

          <div className={styles.styleGrid}>
            {allStyles.map((style) => {
              const isSelected = selectedStyle === style.name;
              return (
                <button
                  key={style.name}
                  type="button"
                  className={`${styles.styleCard} ${isSelected ? styles.styleCardActive : ''}`}
                  onClick={() => setSelectedStyle(style.name)}
                >
                  <div className={styles.styleThumb}>
                    {style.photoUrl ? (
                      <Image
                        src={style.photoUrl}
                        alt={style.name}
                        width={60}
                        height={60}
                        className={styles.styleImg}
                      />
                    ) : (
                      <Symbol name="checkroom" size={24} />
                    )}
                  </div>
                  <span className={styles.styleName}>{style.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── CARD 3: MEASUREMENTS ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>3</span>
              <div>
                <h2 className={styles.cardTitle}>Measurements</h2>
                <p className={styles.cardSubtitle}>
                  {selectedStyle} fit specifications (inches)
                </p>
              </div>
            </div>
          </div>

          {isFitLoaded && !showTweakMeasurements ? (
            <div className={styles.fitLoadedBox}>
              <div className={styles.fitBanner}>
                <Symbol name="auto_awesome" size={20} className={styles.sparkleIcon} />
                <div>
                  <strong>Saved fit loaded from previous order</strong>
                  <p>Measurements automatically applied for {selectedCustomer?.fullName}.</p>
                </div>
              </div>

              <div className={styles.measurePillGrid}>
                {currentSpecPoints.map((pt) => {
                  const val = measures[pt.key];
                  if (!val) return null;
                  return (
                    <div key={pt.key} className={styles.measurePill}>
                      <span className={styles.measurePillLabel}>{pt.label}</span>
                      <span className={styles.measurePillValue}>{val}″</span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className={styles.tweakBtn}
                onClick={() => setShowTweakMeasurements(true)}
              >
                <Symbol name="tune" size={16} />
                <span>Adjust / Tweak Values</span>
              </button>
            </div>
          ) : (
            <div>
              {isFitLoaded && (
                <div className={styles.editingNotice}>
                  <span>Editing measurements for this order:</span>
                  <button
                    type="button"
                    onClick={() => setShowTweakMeasurements(false)}
                    className={styles.collapseTweakBtn}
                  >
                    Done Tweaking
                  </button>
                </div>
              )}

              <div className={styles.measureGrid}>
                {currentSpecPoints.map((pt) => (
                  <div key={pt.key} className={styles.measureInputWrap}>
                    <label className={styles.measureLabel}>{pt.label}</label>
                    <div className={styles.measureField}>
                      <input
                        type="number"
                        step="0.25"
                        placeholder="0.0"
                        className={styles.measureInput}
                        value={measures[pt.key] || ''}
                        onChange={(e) => handleMeasureChange(pt.key, e.target.value)}
                      />
                      <span className={styles.inchSymbol}>″</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.notesWrap}>
                <label className={styles.label}>Fit & Posture Notes (Optional)</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  placeholder="e.g. Client likes snug chest, dropped left shoulder, high armhole"
                  value={measurementNotes}
                  onChange={(e) => setMeasurementNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── CARD 4: FABRIC & STYLE PHOTOS ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>4</span>
              <div>
                <h2 className={styles.cardTitle}>Photos & Material</h2>
                <p className={styles.cardSubtitle}>Fabric snap & design reference</p>
              </div>
            </div>
          </div>

          <div className={styles.photoGrid}>
            {/* Fabric Photo */}
            <div className={styles.photoBox}>
              <span className={styles.photoBoxTitle}>
                <Symbol name="texture" size={16} /> Fabric Material
              </span>
              <p className={styles.photoBoxDesc}>Snap client's fabric to prevent mix-ups</p>

              {fabricImage ? (
                <div className={styles.photoPreviewWrap}>
                  <Image
                    src={fabricImage}
                    alt="Fabric"
                    width={200}
                    height={150}
                    className={styles.photoPreviewImg}
                  />
                  <button
                    type="button"
                    className={styles.removePhotoBtn}
                    onClick={() => setFabricImage(null)}
                  >
                    <Symbol name="close" size={16} />
                  </button>
                </div>
              ) : (
                <label className={styles.photoUploadTrigger}>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingFabric}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file, 'fabric');
                    }}
                  />
                  <Symbol name="photo_camera" size={28} />
                  <span>{uploadingFabric ? 'Uploading…' : 'Snap / Upload Fabric'}</span>
                </label>
              )}
            </div>

            {/* Style Reference Photo */}
            <div className={styles.photoBox}>
              <span className={styles.photoBoxTitle}>
                <Symbol name="photo_library" size={16} /> Style Reference
              </span>
              <p className={styles.photoBoxDesc}>Design or catalog inspiration</p>

              {styleReferenceImage ? (
                <div className={styles.photoPreviewWrap}>
                  <Image
                    src={styleReferenceImage}
                    alt="Style Reference"
                    width={200}
                    height={150}
                    className={styles.photoPreviewImg}
                  />
                  <button
                    type="button"
                    className={styles.removePhotoBtn}
                    onClick={() => setStyleReferenceImage(null)}
                  >
                    <Symbol name="close" size={16} />
                  </button>
                </div>
              ) : (
                <label className={styles.photoUploadTrigger}>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingStyleRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file, 'styleRef');
                    }}
                  />
                  <Symbol name="add_photo_alternate" size={28} />
                  <span>{uploadingStyleRef ? 'Uploading…' : 'Snap / Upload Style'}</span>
                </label>
              )}
            </div>
          </div>
        </section>

        {/* ── CARD 5: BILLING & DELIVERY SCHEDULE ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>5</span>
              <div>
                <h2 className={styles.cardTitle}>Pricing & Delivery</h2>
                <p className={styles.cardSubtitle}>Price, deposit and deadline</p>
              </div>
            </div>
          </div>

          <div className={styles.pricingRow}>
            <div className={styles.formRow}>
              <label className={styles.label}>Total Price ({currencySymbol})</label>
              <div className={styles.inputPrefixWrap}>
                <span className={styles.currencyPrefix}>{currencySymbol}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder="0"
                  value={totalBill}
                  onChange={(e) => setTotalBill(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Deposit Paid ({currencySymbol})</label>
              <div className={styles.inputPrefixWrap}>
                <span className={styles.currencyPrefix}>{currencySymbol}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder="0"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>
          </div>

          {/* Real-time Balance Calculation */}
          <div className={styles.balanceBar}>
            <span className={styles.balanceLabel}>Remaining Balance:</span>
            <span className={styles.balanceValue}>
              {currencySymbol}{formatNumber(numericBalance)}
            </span>
          </div>

          {/* Delivery Date */}
          <div className={styles.deliverySection}>
            <label className={styles.label}>Ready Date / Delivery</label>
            <div className={styles.quickDates}>
              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setQuickDate(3)}
              >
                In 3 Days
              </button>
              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setQuickDate(7)}
              >
                In 1 Week
              </button>
              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setQuickDate(14)}
              >
                In 2 Weeks
              </button>
            </div>

            <input
              type="date"
              className={styles.dateInput}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          {/* Priority & Staff Assignment */}
          <div className={styles.pricingRow}>
            <div className={styles.formRow}>
              <label className={styles.label}>Priority</label>
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={`${styles.segBtn} ${priority === 'normal' ? styles.segActive : ''}`}
                  onClick={() => setPriority('normal')}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`${styles.segBtn} ${priority === 'urgent' ? styles.segActiveUrgent : ''}`}
                  onClick={() => setPriority('urgent')}
                >
                  ⚡ Urgent / Rush
                </button>
              </div>
            </div>

            {staffMembers.length > 0 && (
              <div className={styles.formRow}>
                <label className={styles.label}>Assign to Staff</label>
                <select
                  className={styles.input}
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffMembers.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* ── CREATE ORDER CTA ── */}
        <div className={styles.footerBar}>
          <button
            type="button"
            className={styles.createOrderBtn}
            disabled={submitting}
            onClick={handleCreateOrder}
          >
            {submitting ? 'Creating Order…' : 'Create Order'}
          </button>
        </div>
      </div>

      {/* ── ORDER CREATED SUCCESS & WHATSAPP RECEIPT SHEET ── */}
      <BottomSheet
        isOpen={receiptSheetOpen}
        onClose={() => {
          setReceiptSheetOpen(false);
          router.replace(ROUTES.production);
        }}
        title="Order Created"
      >
        {completedOrder && selectedCustomer && (
          <div className={styles.receiptModal}>
            <div className={styles.successIconWrap}>
              <Symbol name="check_circle" size={48} className={styles.successIcon} />
            </div>

            <h3 className={styles.receiptTitle}>Order Logged Successfully!</h3>
            <p className={styles.receiptDesc}>
              {completedOrder.styleName || selectedStyle} for {selectedCustomer.fullName} has been queued into production.
            </p>

            <div className={styles.receiptSummaryCard}>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Client</span>
                <span className={styles.receiptBold}>{selectedCustomer.fullName}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Garment</span>
                <span className={styles.receiptBold}>{completedOrder.styleName || selectedStyle}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Total Bill</span>
                <span className={styles.receiptBold}>
                  {currencySymbol}{formatNumber(completedOrder.totalBill)}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Deposit Paid</span>
                <span className={styles.receiptBold}>
                  {currencySymbol}{formatNumber(completedOrder.depositPaid)}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Balance Due</span>
                <span className={styles.receiptHighlight}>
                  {currencySymbol}{formatNumber(Math.max(0, completedOrder.totalBill - completedOrder.depositPaid))}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Ready By</span>
                <span className={styles.receiptBold}>
                  {completedOrder.dueDate
                    ? new Date(completedOrder.dueDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'To be confirmed'}
                </span>
              </div>
            </div>

            {/* 1-Tap WhatsApp Receipt Button */}
            <a
              href={getWhatsAppLink(selectedCustomer.whatsappNumber, getWhatsAppReceiptText())}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappReceiptBtn}
            >
              <Symbol name="send" size={20} />
              <span>Send Receipt via WhatsApp</span>
            </a>

            <button
              type="button"
              className={styles.finishBtn}
              onClick={() => {
                setReceiptSheetOpen(false);
                router.replace(ROUTES.production);
              }}
            >
              Go to Production Queue
            </button>
          </div>
        )}
      </BottomSheet>
    </PageLayout>
  );
}
