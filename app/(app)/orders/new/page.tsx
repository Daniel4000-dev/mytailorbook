'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import Symbol from '@/components/ui/Symbol/Symbol';
import StyleMeasureForm from '@/components/orders/StyleMeasureForm/StyleMeasureForm';
import {
  GARMENT_STYLES,
  STYLE_MEASUREMENTS,
  DEFAULT_MEASURE_SPEC,
  ORDER_STATUSES,
} from '@/lib/constants';
import { getStylePhotos } from '@/lib/style-photos';
import { formatCurrency, formatPhone } from '@/lib/formatters';
import type { Customer, Measurements, Order, OrderStatus, Priority } from '@/lib/types';
import styles from './page.module.css';

type Step = 'customer' | 'garments' | 'measure' | 'details';

interface UnitDraft {
  key: string;
  styleName: string;
  details: string;
  totalBill: string;
  depositPaid: string;
  dueDate: string;
  assignedTo: string;
  inspirationImages: string[];
}

/** Walk-in order ritual: pick the client, tap garments into the basket,
 *  measure each distinct style against its own guide, then price and
 *  schedule every piece. Creates one production card per garment,
 *  sharing a batch id. */
export default function NewOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewOrderWizard />
    </Suspense>
  );
}

function NewOrderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { customers, orders, staffMembers, isLoaded, addOrderBatch, updateCustomerMeasurements, updateCustomerStyleProfile } = useData();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [measureIndex, setMeasureIndex] = useState(0);
  const [measures, setMeasures] = useState<Record<string, Record<string, string>>>({});
  const [updateProfile, setUpdateProfile] = useState(true);
  const [activeMeasureKey, setActiveMeasureKey] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitDraft[]>([]);
  const [priority, setPriority] = useState<Priority>('normal');
  const [startingStage, setStartingStage] = useState<OrderStatus>('Documented');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ?customer=<id> (from the new-client wizard or a profile page) skips
  // straight to garments once data is in.
  useEffect(() => {
    if (!isLoaded || customer) return;
    const preselected = searchParams.get('customer');
    if (preselected) {
      const found = customers.find((c) => c.id === preselected);
      if (found) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCustomer(found);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep('garments');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  /* ── Catalog, sorted by this client's preferred styles ─────── */
  const catalog = useMemo(() => {
    const preferred = customer?.preferredStyles || [];
    const preset = [...GARMENT_STYLES].sort((a, b) => {
      const ap = preferred.includes(a.name) ? 0 : 1;
      const bp = preferred.includes(b.name) ? 0 : 1;
      return ap - bp;
    });
    return [
      ...preset,
      ...customStyles.map((name) => ({ name, subtitle: 'Custom item', keywords: [name.toLowerCase()] })),
    ];
  }, [customer, customStyles]);

  /** The shop's own latest photo of each style — the catalog doubles as
   *  the atelier's portfolio. */
  const stylePhoto = useMemo(() => getStylePhotos(orders, catalog), [catalog, orders]);

  const basket = useMemo(
    () => catalog.filter((s) => (counts[s.name] || 0) > 0).map((s) => ({ ...s, count: counts[s.name] })),
    [catalog, counts]
  );
  const totalItems = basket.reduce((sum, s) => sum + s.count, 0);
  const basketSummary = basket.map((s) => `${s.name} (${s.count})`).join(', ');

  const specFor = (styleName: string) => STYLE_MEASUREMENTS[styleName] || DEFAULT_MEASURE_SPEC;
  const currentStyle = basket[measureIndex]?.name;
  const currentSpec = currentStyle ? specFor(currentStyle) : DEFAULT_MEASURE_SPEC;
  const currentValues = (currentStyle && measures[currentStyle]) || {};

  /* ── Import sources for the measure step ───────────────────── */
  const lastSameStyleOrder = useMemo(() => {
    if (!customer || !currentStyle) return null;
    const keywords = specForKeywords(currentStyle);
    return (
      orders
        .filter(
          (o) =>
            o.customerId === customer.id &&
            o.measurements &&
            keywords.some((k) => o.orderDetails.toLowerCase().includes(k))
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null
    );
  }, [customer, currentStyle, orders]);

  function specForKeywords(styleName: string): string[] {
    return GARMENT_STYLES.find((s) => s.name === styleName)?.keywords || [styleName.toLowerCase()];
  }

  const setMeasureValue = (key: string, value: string) => {
    if (!currentStyle) return;
    setMeasures((prev) => ({ ...prev, [currentStyle]: { ...(prev[currentStyle] || {}), [key]: value } }));
  };

  /* ── Step transitions ──────────────────────────────────────── */
  const goToMeasure = () => {
    setMeasureIndex(0);
    setActiveMeasureKey(null);
    setStep('measure');
  };

  const goToDetails = () => {
    // Expand the basket into one draft per garment unit, keeping any
    // drafts the user already touched on a previous pass.
    setUnits((prev) => {
      const next: UnitDraft[] = [];
      for (const s of basket) {
        const existing = prev.filter((u) => u.styleName === s.name);
        for (let i = 0; i < s.count; i++) {
          next.push(
            existing[i] || {
              key: `${s.name}-${crypto.randomUUID()}`,
              styleName: s.name,
              details: s.name,
              totalBill: '',
              depositPaid: '',
              dueDate: '',
              assignedTo: '',
              inspirationImages: [],
            }
          );
        }
      }
      return next;
    });
    setStep('details');
  };

  const stepBack = () => {
    setError('');
    if (step === 'details') {
      setMeasureIndex(Math.max(0, basket.length - 1));
      setStep(basket.length > 0 ? 'measure' : 'garments');
    } else if (step === 'measure') {
      if (measureIndex > 0) setMeasureIndex(measureIndex - 1);
      else setStep('garments');
    } else if (step === 'garments') {
      if (searchParams.get('customer')) router.back();
      else setStep('customer');
    } else {
      router.back();
    }
  };

  const measureNext = () => {
    setActiveMeasureKey(null);
    if (measureIndex < basket.length - 1) setMeasureIndex(measureIndex + 1);
    else goToDetails();
  };

  /* ── Create ────────────────────────────────────────────────── */
  const parsedMeasures = (styleName: string): Measurements | undefined => {
    const raw = measures[styleName];
    if (!raw) return undefined;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const num = parseFloat(v);
      if (!isNaN(num)) out[k] = num;
    }
    return Object.keys(out).length > 0 ? (out as Measurements) : undefined;
  };

  const orderTotal = units.reduce((sum, u) => sum + (parseInt(u.totalBill.replace(/,/g, '')) || 0), 0);

  const handleCreate = async () => {
    if (!customer) return;
    setError('');
    if (units.some((u) => !u.details.trim() || !u.totalBill)) {
      setError('Every garment needs a description and a total bill.');
      return;
    }
    for (const u of units) {
      const total = parseInt(u.totalBill.replace(/,/g, '')) || 0;
      const deposit = parseInt(u.depositPaid.replace(/,/g, '')) || 0;
      if (deposit > total) {
        setError(`Deposit exceeds the total bill for ${u.details}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const garmentOrders: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'>[] = units.map((u) => {
        const assignee = staffMembers.find((s) => s.uid === u.assignedTo);
        return {
          customerId: customer.id,
          customerName: customer.fullName,
          orderDetails: u.details.trim(),
          totalBill: parseInt(u.totalBill.replace(/,/g, '')) || 0,
          depositPaid: parseInt(u.depositPaid.replace(/,/g, '')) || 0,
          status: startingStage,
          assignedTo: u.assignedTo || undefined,
          assignedToName: assignee?.name,
          dueDate: u.dueDate ? new Date(u.dueDate).toISOString() : undefined,
          priority,
          measurements: parsedMeasures(u.styleName),
          images: [],
          inspirationImages: u.inspirationImages,
          statusHistory: [{
            from: null,
            to: startingStage,
            changedBy: user?.uid || 'unknown',
            changedByName: user?.name || 'Unknown',
            timestamp: new Date().toISOString(),
          }],
        };
      });

      await addOrderBatch(garmentOrders);

      // Default-on: freshly taken numbers also refresh the body profile and
      // this style's saved measurement profile.
      if (updateProfile) {
        const merged: Measurements = { ...(customer.measurements || {}) };
        for (const s of basket) {
          Object.assign(merged, parsedMeasures(s.name) || {});
        }
        if (Object.keys(merged).length > 0) {
          await updateCustomerMeasurements(customer.id, merged).catch(() => {});
        }
        for (const s of basket) {
          const styleValues = parsedMeasures(s.name);
          if (styleValues && Object.keys(styleValues).length > 0) {
            await updateCustomerStyleProfile(customer.id, s.name, styleValues).catch(() => {});
          }
        }
      }

      showToast(
        units.length > 1
          ? `${units.length} orders created for ${customer.fullName}`
          : `Order created for ${customer.fullName}`,
        'success'
      );
      router.replace('/production');
    } catch {
      setError('Failed to create the order — check your connection and try again.');
      setSubmitting(false);
    }
  };

  /* ── Inspiration upload (per unit) ─────────────────────────── */
  const handleInspoUpload = async (unitKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.shopId) return;
    setUploadingKey(unitKey);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.shopId}/inspo/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        urls.push(supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl);
      }
      setUnits((prev) => prev.map((u) => (u.key === unitKey ? { ...u, inspirationImages: [...u.inspirationImages, ...urls] } : u)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingKey(null);
      e.target.value = '';
    }
  };

  const updateUnit = (key: string, patch: Partial<UnitDraft>) => {
    setUnits((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  };

  /* ── Render ────────────────────────────────────────────────── */
  const stepMeta: Record<Step, { label: string; progress: number }> = {
    customer: { label: 'Select Client', progress: 15 },
    garments: { label: 'Select Garments', progress: 40 },
    measure: {
      label: currentStyle ? `Measurements · ${currentStyle}${basket.length > 1 ? ` (${measureIndex + 1}/${basket.length})` : ''}` : 'Measurements',
      progress: 40 + (35 * (measureIndex + 1)) / Math.max(1, basket.length),
    },
    details: { label: 'Order Details', progress: 92 },
  };

  const filteredCustomers = customerQuery.trim()
    ? customers.filter(
        (c) => c.fullName.toLowerCase().includes(customerQuery.toLowerCase()) || c.whatsappNumber.includes(customerQuery)
      )
    : customers;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={stepBack} aria-label="Go back">
          <Symbol name="arrow_back" size={26} />
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.headerTitle}>New Order</h1>
          <span className={styles.stepLabel}>{stepMeta[step].label}</span>
        </div>
        <span className={styles.headerSpacer}>
          {step === 'garments' && totalItems > 0 && <span className={styles.bagCount}>{totalItems}</span>}
        </span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${stepMeta[step].progress}%` }} />
        </div>
      </header>

      <main className={styles.scroll}>
        {/* ── Step: customer ─────────────────────────────────── */}
        {step === 'customer' && (
          <div className={styles.col}>
            <div className={styles.searchWrap}>
              <Symbol name="search" size={20} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search name or phone…"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
            </div>
            <div className={styles.customerList}>
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.customerRow}
                  onClick={() => { setCustomer(c); setStep('garments'); }}
                >
                  <span className={styles.customerAvatar}>
                    {c.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <span className={styles.customerInfo}>
                    <span className={styles.customerName}>{c.fullName}</span>
                    <span className={styles.customerPhone}>{formatPhone(c.whatsappNumber)}</span>
                  </span>
                  <Symbol name="arrow_forward_ios" size={14} className={styles.rowChevron} />
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <p className={styles.emptyNote}>No client matches “{customerQuery}”.</p>
              )}
            </div>
            <Link href="/customers/new" className={styles.newClientLink}>
              <Symbol name="person_add" size={20} /> Walk-in? Register a new client
            </Link>
          </div>
        )}

        {/* ── Step: garments ─────────────────────────────────── */}
        {step === 'garments' && (
          <div className={styles.col}>
            <div>
              <h2 className={styles.stepTitle}>Select Garments</h2>
              <p className={styles.stepSub}>
                For {customer?.fullName} — tap a style to add it, use the stepper for more of the same.
              </p>
            </div>
            <div className={styles.garmentGrid}>
              {catalog.map((s) => {
                const count = counts[s.name] || 0;
                const photo = stylePhoto[s.name];
                return (
                  <div
                    key={s.name}
                    className={`${styles.garmentCard} ${count > 0 ? styles.garmentCardSelected : ''}`}
                    onClick={() => setCounts((p) => ({ ...p, [s.name]: (p[s.name] || 0) + 1 }))}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.garmentPhoto}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={s.name} />
                      ) : (
                        <span className={styles.garmentInitial}>{s.name[0]}</span>
                      )}
                      <div className={styles.garmentShade} />
                    </div>
                    {count > 0 ? (
                      <div className={styles.stepper} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label={`Remove one ${s.name}`}
                          onClick={() => setCounts((p) => ({ ...p, [s.name]: Math.max(0, (p[s.name] || 0) - 1) }))}
                        >
                          <Symbol name="remove" size={18} />
                        </button>
                        <span>{count}</span>
                        <button
                          type="button"
                          className={styles.stepperAdd}
                          aria-label={`Add one ${s.name}`}
                          onClick={() => setCounts((p) => ({ ...p, [s.name]: (p[s.name] || 0) + 1 }))}
                        >
                          <Symbol name="add" size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className={styles.addBubble} aria-hidden="true">
                        <Symbol name="add" size={20} />
                      </span>
                    )}
                    {count > 0 && <span className={styles.countBadge}>x{count}</span>}
                    <div className={styles.garmentLabel}>
                      <h3>{s.name}</h3>
                      <p>{s.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {showCustomInput ? (
              <input
                autoFocus
                className={styles.customInput}
                placeholder="Garment name, e.g. Choir Robe…"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onBlur={() => {
                  const name = customDraft.trim();
                  if (name && !catalog.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
                    setCustomStyles((p) => [...p, name]);
                    setCounts((p) => ({ ...p, [name]: 1 }));
                  }
                  setCustomDraft('');
                  setShowCustomInput(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <button type="button" className={styles.customBtn} onClick={() => setShowCustomInput(true)}>
                <Symbol name="add_circle" size={22} />
                Add Custom Item
              </button>
            )}
          </div>
        )}

        {/* ── Step: measure ──────────────────────────────────── */}
        {step === 'measure' && currentStyle && (
          <div className={styles.col}>
            <div>
              <h2 className={styles.stepTitle}>{currentStyle} Measurements</h2>
              <p className={styles.stepSub}>
                For {customer?.fullName} — tap a number on the guide or fill the cards below. Skip anything you’ll take at fitting.
              </p>
            </div>

            <StyleMeasureForm
              spec={currentSpec}
              values={currentValues}
              onChange={setMeasureValue}
              activeKey={activeMeasureKey}
              onActiveKeyChange={setActiveMeasureKey}
              importSources={[
                ...(lastSameStyleOrder
                  ? [{
                      label: `Import from last ${currentStyle} (${new Date(lastSameStyleOrder.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })})`,
                      icon: 'history',
                      measurements: lastSameStyleOrder.measurements!,
                      onImported: () => showToast('Measurements imported — adjust anything that changed', 'success'),
                    }]
                  : []),
                ...(customer?.measurements && Object.keys(customer.measurements).length > 0
                  ? [{
                      label: 'Import from body profile',
                      icon: 'person',
                      measurements: customer.measurements,
                      onImported: () => showToast('Measurements imported — adjust anything that changed', 'success'),
                    }]
                  : []),
              ]}
            />

            <label className={styles.profileToggle}>
              <input type="checkbox" checked={updateProfile} onChange={(e) => setUpdateProfile(e.target.checked)} />
              Also update {customer?.fullName.split(' ')[0]}&rsquo;s body profile with these numbers
            </label>
          </div>
        )}

        {/* ── Step: details ──────────────────────────────────── */}
        {step === 'details' && (
          <div className={styles.col}>
            <div>
              <h2 className={styles.stepTitle}>Order Details</h2>
              <p className={styles.stepSub}>Price and schedule each piece for {customer?.fullName}.</p>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {units.map((u, i) => (
              <section key={u.key} className={styles.unitCard}>
                <header className={styles.unitHeader}>
                  <span className={styles.unitNum}>{i + 1}</span>
                  <input
                    className={styles.unitName}
                    value={u.details}
                    onChange={(e) => updateUnit(u.key, { details: e.target.value })}
                    aria-label="Garment description"
                  />
                </header>
                <div className={styles.unitGrid}>
                  <div className={styles.unitField}>
                    <label className={styles.capsLabel}>Total Bill (₦)</label>
                    <input
                      className={styles.unitInput}
                      inputMode="numeric"
                      placeholder="0"
                      value={u.totalBill}
                      onChange={(e) => updateUnit(u.key, { totalBill: e.target.value.replace(/[^0-9,]/g, '') })}
                    />
                  </div>
                  <div className={styles.unitField}>
                    <label className={styles.capsLabel}>Deposit Paid (₦)</label>
                    <input
                      className={styles.unitInput}
                      inputMode="numeric"
                      placeholder="0"
                      value={u.depositPaid}
                      onChange={(e) => updateUnit(u.key, { depositPaid: e.target.value.replace(/[^0-9,]/g, '') })}
                    />
                  </div>
                  <div className={styles.unitField}>
                    <label className={styles.capsLabel}>Due Date</label>
                    <input
                      className={styles.unitInput}
                      type="date"
                      value={u.dueDate}
                      onChange={(e) => updateUnit(u.key, { dueDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.unitField}>
                    <label className={styles.capsLabel}>Assign To</label>
                    <select
                      className={styles.unitInput}
                      value={u.assignedTo}
                      onChange={(e) => updateUnit(u.key, { assignedTo: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {staffMembers
                        .filter((s) => s.active !== false)
                        .map((s) => (
                          <option key={s.uid} value={s.uid}>
                            {s.uid === user?.uid ? `${s.name} (You)` : s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className={styles.inspoRow}>
                  {u.inspirationImages.map((url, idx) => (
                    <span key={idx} className={styles.inspoThumb}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Inspiration" />
                      <button
                        type="button"
                        aria-label="Remove inspiration photo"
                        onClick={() => updateUnit(u.key, { inspirationImages: u.inspirationImages.filter((_, j) => j !== idx) })}
                      >
                        <Symbol name="close" size={12} />
                      </button>
                    </span>
                  ))}
                  <label className={styles.inspoAdd}>
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => handleInspoUpload(u.key, e)} disabled={uploadingKey === u.key} />
                    <Symbol name="add_photo_alternate" size={18} />
                    {uploadingKey === u.key ? 'Uploading…' : 'Inspo'}
                  </label>
                </div>
              </section>
            ))}

            <section className={styles.orderLevel}>
              <div className={styles.unitField}>
                <label className={styles.capsLabel}>Priority</label>
                <select className={styles.unitInput} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="rush">Rush</option>
                </select>
              </div>
              <div className={styles.unitField}>
                <label className={styles.capsLabel}>Starting Stage</label>
                <select
                  className={styles.unitInput}
                  value={startingStage}
                  onChange={(e) => setStartingStage(e.target.value as OrderStatus)}
                >
                  {ORDER_STATUSES.filter((s) => s !== 'Completed').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ── Sticky summary / action bar ──────────────────────── */}
      {step === 'garments' && (
        <div className={styles.summaryBarWrap}>
          <div className={styles.summaryBar}>
            <div className={styles.summaryLeft}>
              <span className={styles.summaryCount}>{totalItems}</span>
              <span className={styles.summaryText}>
                <b>{totalItems === 1 ? 'Item Selected' : 'Items Selected'}</b>
                <small>{basketSummary || 'Tap a style to begin'}</small>
              </span>
            </div>
            <button type="button" className={styles.proceedBtn} disabled={totalItems === 0} onClick={goToMeasure}>
              Proceed <Symbol name="arrow_forward" size={20} fill />
            </button>
          </div>
        </div>
      )}
      {step === 'measure' && (
        <div className={styles.summaryBarWrap}>
          <div className={styles.summaryBar}>
            <button type="button" className={styles.skipBtn} onClick={measureNext}>
              Skip for now
            </button>
            <button type="button" className={styles.proceedBtn} onClick={measureNext}>
              {measureIndex < basket.length - 1 ? `Next: ${basket[measureIndex + 1].name}` : 'Proceed to Details'}
              <Symbol name="arrow_forward" size={20} fill />
            </button>
          </div>
        </div>
      )}
      {step === 'details' && (
        <div className={styles.summaryBarWrap}>
          <div className={styles.summaryBar}>
            <div className={styles.summaryLeft}>
              <span className={styles.summaryText}>
                <small>Order Total</small>
                <b className={styles.summaryTotal}>{formatCurrency(orderTotal)}</b>
              </span>
            </div>
            <button type="button" className={styles.proceedBtn} disabled={submitting} onClick={handleCreate}>
              {submitting ? 'Creating…' : units.length > 1 ? `Create ${units.length} Orders` : 'Create Order'}
              <Symbol name="check_circle" size={20} fill />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
