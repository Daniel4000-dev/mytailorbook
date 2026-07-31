'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import Symbol from '@/components/ui/Symbol/Symbol';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import CustomStyleFieldBuilder from '@/components/orders/CustomStyleFieldBuilder/CustomStyleFieldBuilder';
import {
  GARMENT_STYLES,
  STYLE_MEASUREMENTS,
  DEFAULT_MEASURE_SPEC,
  buildCustomStyleSpec,
} from '@/lib/constants';
import { getStylePhotos } from '@/lib/style-photos';
import { formatCurrency } from '@/lib/formatters';
import type { Customer, Measurements, Order, OrderStatus, Priority } from '@/lib/types';
import CustomerStep from './CustomerStep';
import GarmentStep from './GarmentStep';
import MeasureStep from './MeasureStep';
import DetailsStep, { type UnitDraft } from './DetailsStep';
import styles from '../page.module.css';

type Step = 'customer' | 'garments' | 'measure' | 'details';

/** Walk-in order ritual: pick the client, tap garments into the basket,
 *  measure each distinct style against its own guide, then price and
 *  schedule every piece. Creates one production card per garment,
 *  sharing a batch id. */
export default function NewOrderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { customers, orders, staffMembers, currentShop, isLoaded, addOrderBatch, updateCustomerMeasurements, updateCustomerStyleProfile, upsertCustomStyle } = useData();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Shop-wide custom styles persist across orders (seeded from the shop
  // record); newly typed ones this session are added on top and saved back.
  const [customStyles, setCustomStyles] = useState<
    { name: string; photoUrl?: string; measurementFields?: { id: string; label: string }[] }[]
  >([]);
  const [uploadingCustomPhoto, setUploadingCustomPhoto] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  // A brand-new custom style (no saved fields yet) opens the field builder
  // right after creation, instead of silently handing over the generic
  // DEFAULT_MEASURE_SPEC at the measure step.
  const [fieldBuilderStyle, setFieldBuilderStyle] = useState<string | null>(null);
  const [measureIndex, setMeasureIndex] = useState(0);
  const [measures, setMeasures] = useState<Record<string, Record<string, string>>>({});
  // Two independent decisions: a style profile is *supposed* to diverge
  // from the body profile (e.g. a loose Agbada's chest ease vs. the
  // client's actual body chest) — saving one should never silently
  // overwrite the other, so each has its own default. Style-profile
  // capture is the normal per-order thing to do; body-profile updates are
  // a deliberate re-measurement, not an incidental side effect of ordering
  // a specific garment, so that one starts off.
  const [saveStyleProfile, setSaveStyleProfile] = useState(true);
  const [updateBodyProfile, setUpdateBodyProfile] = useState(false);
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
        setStep('garments');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  /* ── Catalog, gendered (no mixed picker) and sorted by this client's
   *  preferred styles ─────────────────────────────────────────── */
  const allCustomStyles = useMemo(() => {
    // Session-local entries (just typed, possibly just got a photo) take
    // priority over the shop's persisted list for the same name.
    const merged = new Map((currentShop?.customStyles || []).map((s) => [s.name, s]));
    for (const s of customStyles) merged.set(s.name, s);
    return [...merged.values()];
  }, [currentShop, customStyles]);

  const catalog = useMemo(() => {
    const preferred = customer?.preferredStyles || [];
    const genderStyles = customer ? GARMENT_STYLES.filter((s) => s.gender === customer.gender) : GARMENT_STYLES;
    const preset = [...genderStyles].sort((a, b) => {
      const ap = preferred.includes(a.name) ? 0 : 1;
      const bp = preferred.includes(b.name) ? 0 : 1;
      return ap - bp;
    });
    return [
      ...preset,
      ...allCustomStyles.map((s) => ({ name: s.name, subtitle: 'Custom item', keywords: [s.name.toLowerCase()], photoUrl: s.photoUrl })),
    ];
  }, [customer, allCustomStyles]);

  /** Permanent placeholder for built-in styles; the shop's own uploaded
   *  photo for a custom style once one's been added. */
  const stylePhoto = useMemo(() => getStylePhotos(catalog), [catalog]);

  const basket = useMemo(
    () => catalog.filter((s) => (counts[s.name] || 0) > 0).map((s) => ({ ...s, count: counts[s.name] })),
    [catalog, counts]
  );
  const totalItems = basket.reduce((sum, s) => sum + s.count, 0);
  const basketSummary = basket.map((s) => `${s.name} (${s.count})`).join(', ');

  const specFor = (styleName: string) => {
    if (STYLE_MEASUREMENTS[styleName]) return STYLE_MEASUREMENTS[styleName];
    const custom = allCustomStyles.find((s) => s.name === styleName);
    if (custom?.measurementFields && custom.measurementFields.length > 0) {
      return buildCustomStyleSpec(custom.measurementFields);
    }
    return DEFAULT_MEASURE_SPEC;
  };
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
              materialSuppliedBy: 'shop',
              materialCost: '',
              otherCosts: '',
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
          styleName: u.styleName,
          materialSuppliedBy: u.materialSuppliedBy,
          materialCost: u.materialSuppliedBy === 'shop' ? (parseInt(u.materialCost.replace(/,/g, '')) || 0) : 0,
          otherCosts: parseInt(u.otherCosts.replace(/,/g, '')) || 0,
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

      // These are two independent stores on purpose — a style profile is
      // meant to capture this specific garment's fit (which can and should
      // differ from the client's actual body), while the body profile is
      // the client's real measurements. Saving one must never overwrite
      // the other.
      if (saveStyleProfile) {
        for (const s of basket) {
          const styleValues = parsedMeasures(s.name);
          if (styleValues && Object.keys(styleValues).length > 0) {
            await updateCustomerStyleProfile(customer.id, s.name, styleValues).catch(() => {});
          }
        }
      }
      if (updateBodyProfile) {
        const merged: Measurements = { ...(customer.measurements || {}) };
        for (const s of basket) {
          Object.assign(merged, parsedMeasures(s.name) || {});
        }
        if (Object.keys(merged).length > 0) {
          await updateCustomerMeasurements(customer.id, merged).catch(() => {});
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

  /* ── Custom style photo — the "avenue" to add a picture for a
   *  shop-defined style once it's created ────────────────────── */
  const handleCustomStylePhoto = async (styleName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !user?.shopId) return;
    setUploadingCustomPhoto(styleName);
    try {
      const file = await compressImage(rawFile);
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.shopId}/custom-styles/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const photoUrl = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;

      setCustomStyles((prev) => {
        const next = prev.some((s) => s.name === styleName)
          ? prev.map((s) => (s.name === styleName ? { ...s, photoUrl } : s))
          : [...prev, { name: styleName, photoUrl }];
        return next;
      });
      // Reads the shop's custom styles fresh from the database and merges
      // by name server-side, rather than computing the merge from this
      // component's (possibly stale) `currentShop` snapshot — avoids
      // creating a duplicate entry if the style was only just created.
      await upsertCustomStyle(styleName, photoUrl);
      showToast('Style photo saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingCustomPhoto(null);
      e.target.value = '';
    }
  };

  /* ── Custom style measurement fields ───────────────────────── */
  const handleSaveCustomFields = (name: string, fields: { id: string; label: string }[]) => {
    setCustomStyles((prev) =>
      prev.some((s) => s.name === name)
        ? prev.map((s) => (s.name === name ? { ...s, measurementFields: fields } : s))
        : [...prev, { name, measurementFields: fields }]
    );
    setFieldBuilderStyle(null);
    upsertCustomStyle(name, undefined, fields).catch(() => {
      showToast('Could not save the fields — check your connection and try again', 'error');
    });
  };

  /* ── Inspiration upload (per unit) ─────────────────────────── */
  const handleInspoUpload = async (unitKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.shopId) return;
    setUploadingKey(unitKey);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const rawFile of Array.from(files)) {
        const file = await compressImage(rawFile);
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

  const handleCountChange = (name: string, delta: number) => {
    setCounts((p) => ({ ...p, [name]: Math.max(0, (p[name] || 0) + delta) }));
  };

  const handleCustomDraftCommit = () => {
    const name = customDraft.trim();
    if (name && !catalog.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setCustomStyles((p) => [...p, { name }]);
      setCounts((p) => ({ ...p, [name]: 1 }));
      // Remembered shop-wide so it's already in the catalog next time, same
      // as a built-in style. Merged server-side against a fresh read, not
      // this component's snapshot — see upsertCustomStyle.
      upsertCustomStyle(name).catch(() => {});
      // Brand new — no saved fields yet, so prompt for them now instead of
      // silently falling back to the generic DEFAULT_MEASURE_SPEC later at
      // the measure step.
      setFieldBuilderStyle(name);
    }
    setCustomDraft('');
    setShowCustomInput(false);
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
        {step === 'customer' && (
          <CustomerStep
            customerQuery={customerQuery}
            onQueryChange={setCustomerQuery}
            filteredCustomers={filteredCustomers}
            isLoaded={isLoaded}
            onSelect={(c) => { setCustomer(c); setStep('garments'); }}
          />
        )}

        {step === 'garments' && (
          <GarmentStep
            customer={customer}
            catalog={catalog}
            counts={counts}
            onCountChange={handleCountChange}
            stylePhoto={stylePhoto}
            uploadingCustomPhoto={uploadingCustomPhoto}
            onCustomStylePhoto={handleCustomStylePhoto}
            showCustomInput={showCustomInput}
            onShowCustomInput={() => setShowCustomInput(true)}
            customDraft={customDraft}
            onCustomDraftChange={setCustomDraft}
            onCustomDraftCommit={handleCustomDraftCommit}
          />
        )}

        {step === 'measure' && currentStyle && (
          <MeasureStep
            customer={customer}
            currentStyle={currentStyle}
            currentSpec={currentSpec}
            currentValues={currentValues}
            onMeasureValueChange={setMeasureValue}
            activeMeasureKey={activeMeasureKey}
            onActiveMeasureKeyChange={setActiveMeasureKey}
            lastSameStyleOrder={lastSameStyleOrder}
            onImported={() => showToast('Measurements imported — adjust anything that changed', 'success')}
            saveStyleProfile={saveStyleProfile}
            onSaveStyleProfileChange={setSaveStyleProfile}
            updateBodyProfile={updateBodyProfile}
            onUpdateBodyProfileChange={setUpdateBodyProfile}
          />
        )}

        {step === 'details' && (
          <DetailsStep
            customer={customer}
            error={error}
            units={units}
            onUpdateUnit={updateUnit}
            staffMembers={staffMembers}
            currentUserUid={user?.uid}
            uploadingKey={uploadingKey}
            onInspoUpload={handleInspoUpload}
            priority={priority}
            onPriorityChange={setPriority}
            startingStage={startingStage}
            onStartingStageChange={setStartingStage}
          />
        )}
      </main>

      {/* ── Sticky summary / action bar — portaled straight to
           document.body, see FixedBottomPortal for why. ────────── */}
      {step === 'garments' && (
        <FixedBottomPortal>
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
        </FixedBottomPortal>
      )}
      {step === 'measure' && (
        <FixedBottomPortal>
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
        </FixedBottomPortal>
      )}
      {step === 'details' && (
        <FixedBottomPortal>
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
        </FixedBottomPortal>
      )}

      <CustomStyleFieldBuilder
        isOpen={!!fieldBuilderStyle}
        styleName={fieldBuilderStyle || ''}
        initialFields={(fieldBuilderStyle && allCustomStyles.find((s) => s.name === fieldBuilderStyle)?.measurementFields) || []}
        onClose={() => setFieldBuilderStyle(null)}
        onSave={(fields) => fieldBuilderStyle && handleSaveCustomFields(fieldBuilderStyle, fields)}
      />
    </div>
  );
}
