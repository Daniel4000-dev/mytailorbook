'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Symbol from '@/components/ui/Symbol/Symbol';
import { compressImage } from '@/lib/compressImage';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';
import SettingsSkeleton from '../_components/SettingsSkeleton';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

type EditableField = 'name' | 'about' | 'phone' | 'address' | 'currency' | null;

const REVENUE_BENCHMARKS = [
  { label: '500k', value: 500000 },
  { label: '1m', value: 1000000 },
  { label: '2.5m', value: 2500000 },
  { label: '5m', value: 5000000 },
  { label: '10m', value: 10000000 },
];

export default function StudioSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop, isLoaded } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);

  // Field editor modal/sheet state
  const [activeField, setActiveField] = useState<EditableField>(null);
  const [draftValue, setDraftValue] = useState('');
  const [savingField, setSavingField] = useState(false);

  // Benchmarks state
  const [targetRevenue, setTargetRevenue] = useState<number>(currentShop?.monthlyRevenueTarget || 1000000);
  const [weeklyCap, setWeeklyCap] = useState<number>(currentShop?.weeklyCapacity || 5);
  const [dailyCap, setDailyCap] = useState<number>(currentShop?.dailyCapacity || 2);
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Sync capacity from shop when loaded
  const [syncedShopId, setSyncedShopId] = useState<string | undefined>(undefined);
  if (currentShop && currentShop.id !== syncedShopId) {
    setSyncedShopId(currentShop.id);
    setTargetRevenue(currentShop.monthlyRevenueTarget || 1000000);
    setWeeklyCap(currentShop.weeklyCapacity || 5);
    setDailyCap(currentShop.dailyCapacity || 2);
  }

  const handleOpenEditor = (field: EditableField) => {
    setActiveField(field);
    if (field === 'name') setDraftValue(currentShop?.name || '');
    else if (field === 'about') setDraftValue(currentShop?.portfolioSettings?.tagline || '');
    else if (field === 'phone') setDraftValue(currentShop?.phone || '');
    else if (field === 'address') setDraftValue(currentShop?.address || '');
    else if (field === 'currency') setDraftValue(currentShop?.currency || 'NGN');
  };

  const handleSaveField = async () => {
    if (!activeField) return;
    setSavingField(true);
    try {
      if (activeField === 'name') {
        if (!draftValue.trim()) return;
        await updateShop({ name: draftValue.trim() });
        showToast('Studio name updated', 'success');
      } else if (activeField === 'about') {
        const nextSettings = {
          ...(currentShop?.portfolioSettings || {}),
          tagline: draftValue.trim() || undefined,
        };
        await updateShop({ portfolioSettings: nextSettings });
        showToast('Atelier tagline updated', 'success');
      } else if (activeField === 'phone') {
        await updateShop({ phone: draftValue.trim() || undefined });
        showToast('WhatsApp business phone updated', 'success');
      } else if (activeField === 'address') {
        await updateShop({ address: draftValue.trim() || undefined });
        showToast('Atelier address updated', 'success');
      } else if (activeField === 'currency') {
        await updateShop({ currency: draftValue });
        showToast('Studio currency updated', 'success');
      }
      setActiveField(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSavingField(false);
    }
  };

  const handleSelectBusinessMode = async (mode: 'bespoke' | 'rtw' | 'hybrid') => {
    try {
      await updateShop({ businessMode: mode });
      showToast('Atelier specification updated', 'success');
    } catch {
      showToast('Failed to update business model', 'error');
    }
  };

  const handleSaveBenchmarks = async (rev: number, weekly: number, daily: number) => {
    setSavingCapacity(true);
    try {
      await updateShop({
        monthlyRevenueTarget: rev,
        weeklyCapacity: weekly,
        dailyCapacity: daily,
      });
      showToast('Production benchmark updated', 'success');
    } catch {
      showToast('Failed to update capacity', 'error');
    } finally {
      setSavingCapacity(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !currentShop?.id) return;
    setUploadingLogo(true);
    try {
      const file = await compressImage(rawFile, { maxDimension: 800 });
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/branding/logo-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const logoUrl = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;
      await updateShop({ logoUrl });
      showToast('Logo updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setConfirmRemoveLogo(false);
    await updateShop({ logoUrl: '' });
    showToast('Logo removed', 'success');
  };

  if (!isLoaded) {
    return (
      <PageLayout width="narrow" header={<TopBar title="Profile" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
        <SettingsSkeleton />
      </PageLayout>
    );
  }

  const initial = currentShop?.name?.charAt(0)?.toUpperCase() || 'M';
  const currencyCode = currentShop?.currency || 'NGN';
  const currencySymbol =
    (0)
      .toLocaleString('en', {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'narrowSymbol',
      })
      .replace(/[0-9.,\s]/g, '') || '₦';

  return (
    <PageLayout width="narrow" header={<TopBar title="Profile" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
      <div className={styles.container}>
        {/* WhatsApp iOS Style Centered Avatar Hero */}
        <section className={styles.avatarSection} aria-label="Studio Photo">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUploadLogo}
          />
          <button
            type="button"
            className={styles.avatarWrap}
            onClick={() => fileInputRef.current?.click()}
            title="Tap to change studio crest"
          >
            {currentShop?.logoUrl ? (
              <Image
                src={currentShop.logoUrl}
                alt={currentShop.name || 'Studio Crest'}
                width={104}
                height={104}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <span className={styles.avatarCrestLetter}>{initial}</span>
              </div>
            )}
          </button>
          <div className={styles.avatarActions}>
            <button
              type="button"
              className={styles.editPhotoBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? 'Uploading...' : 'Edit photo'}
            </button>
            {currentShop?.logoUrl && (
              <button
                type="button"
                className={styles.removePhotoBtn}
                onClick={() => setConfirmRemoveLogo(true)}
              >
                Remove
              </button>
            )}
          </div>
        </section>

        {/* WhatsApp iOS Style Grouped Card 1: Core Atelier Profile Info */}
        <div className={styles.groupCard}>
          <button
            type="button"
            className={styles.rowItem}
            onClick={() => handleOpenEditor('name')}
          >
            <span className={styles.rowLabel}>Name</span>
            <div className={styles.rowValueWrap}>
              <span className={styles.rowValue}>{currentShop?.name || 'Set Studio Name'}</span>
              <Symbol name="chevron_right" size={18} className={styles.chevron} />
            </div>
          </button>

          <button
            type="button"
            className={styles.rowItem}
            onClick={() => handleOpenEditor('about')}
          >
            <span className={styles.rowLabel}>About</span>
            <div className={styles.rowValueWrap}>
              {currentShop?.portfolioSettings?.tagline ? (
                <span className={styles.rowValue}>{currentShop.portfolioSettings.tagline}</span>
              ) : (
                <span className={`${styles.rowValue} ${styles.rowValuePlaceholder}`}>
                  Share atelier specialty
                </span>
              )}
              <Symbol name="chevron_right" size={18} className={styles.chevron} />
            </div>
          </button>

          <div className={styles.rowItem} style={{ cursor: 'default' }}>
            <span className={styles.rowLabel}>Username</span>
            <div className={styles.rowValueWrap}>
              <span className={styles.rowValue}>@{currentShop?.slug || 'studio'}</span>
              <button
                type="button"
                onClick={() => router.push(ROUTES.portfolio)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                title="View Lookbook"
              >
                <Symbol name="open_in_new" size={16} className={styles.chevron} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.rowItem}
            onClick={() => handleOpenEditor('phone')}
          >
            <span className={styles.rowLabel}>Phone number</span>
            <div className={styles.rowValueWrap}>
              {currentShop?.phone ? (
                <span className={styles.rowValue}>{currentShop.phone}</span>
              ) : (
                <span className={`${styles.rowValue} ${styles.rowValuePlaceholder}`}>
                  Add WhatsApp number
                </span>
              )}
              <Symbol name="chevron_right" size={18} className={styles.chevron} />
            </div>
          </button>

          <button
            type="button"
            className={styles.rowItem}
            onClick={() => handleOpenEditor('address')}
          >
            <span className={styles.rowLabel}>Address</span>
            <div className={styles.rowValueWrap}>
              {currentShop?.address ? (
                <span className={styles.rowValue}>{currentShop.address}</span>
              ) : (
                <span className={`${styles.rowValue} ${styles.rowValuePlaceholder}`}>
                  Add atelier address
                </span>
              )}
              <Symbol name="chevron_right" size={18} className={styles.chevron} />
            </div>
          </button>

          <button
            type="button"
            className={styles.rowItem}
            onClick={() => handleOpenEditor('currency')}
          >
            <span className={styles.rowLabel}>Currency</span>
            <div className={styles.rowValueWrap}>
              <span className={styles.rowValue}>
                {currentShop?.currency || 'NGN'} ({currencySymbol})
              </span>
              <Symbol name="chevron_right" size={18} className={styles.chevron} />
            </div>
          </button>
        </div>

        {/* Group 2: Business Model Specification */}
        <h3 className={styles.sectionHeader}>Atelier Specification</h3>
        <div className={styles.groupCard}>
          <div className={styles.modeGrid}>
            <button
              type="button"
              className={`${styles.modeCard} ${(currentShop?.businessMode || 'bespoke') === 'bespoke' ? styles.modeCardActive : ''}`}
              onClick={() => handleSelectBusinessMode('bespoke')}
            >
              <div className={styles.modeHeader}>
                <span className={styles.modeTitle}>Bespoke Only</span>
                {(currentShop?.businessMode || 'bespoke') === 'bespoke' && (
                  <span style={{ color: 'var(--sf-color-primary, #047857)', display: 'inline-flex' }}>
                    <Symbol name="verified" size={16} />
                  </span>
                )}
              </div>
              <span className={styles.modeDesc}>
                100% custom made-to-measure orders tailored for individual clients.
              </span>
            </button>

            <button
              type="button"
              className={`${styles.modeCard} ${currentShop?.businessMode === 'rtw' ? styles.modeCardActive : ''}`}
              onClick={() => handleSelectBusinessMode('rtw')}
            >
              <div className={styles.modeHeader}>
                <span className={styles.modeTitle}>Ready-to-Wear</span>
                {currentShop?.businessMode === 'rtw' && (
                  <span style={{ color: 'var(--sf-color-primary, #047857)', display: 'inline-flex' }}>
                    <Symbol name="verified" size={16} />
                  </span>
                )}
              </div>
              <span className={styles.modeDesc}>
                Standardized sizing collections produced in batches for direct sale.
              </span>
            </button>

            <button
              type="button"
              className={`${styles.modeCard} ${currentShop?.businessMode === 'hybrid' ? styles.modeCardActive : ''}`}
              onClick={() => handleSelectBusinessMode('hybrid')}
            >
              <div className={styles.modeHeader}>
                <span className={styles.modeTitle}>Hybrid House</span>
                {currentShop?.businessMode === 'hybrid' && (
                  <span style={{ color: 'var(--sf-color-primary, #047857)', display: 'inline-flex' }}>
                    <Symbol name="verified" size={16} />
                  </span>
                )}
              </div>
              <span className={styles.modeDesc}>
                Both custom bespoke commissions and off-the-rack capsule drops.
              </span>
            </button>
          </div>
        </div>

        {/* Group 3: Capacity & Benchmarks */}
        <h3 className={styles.sectionHeader}>Production Benchmark & Capacity</h3>
        <div className={`${styles.groupCard} ${styles.benchmarkCard}`}>
          <div>
            <label className={styles.capacityLabel}>
              Monthly Revenue Goal ({currencySymbol})
            </label>
            <Input
              value={String(targetRevenue)}
              onChange={(e) => setTargetRevenue(Number(e.target.value.replace(/[^0-9]/g, '')))}
              placeholder="1000000"
            />
            <div className={styles.benchmarkPills}>
              {REVENUE_BENCHMARKS.map((bm) => (
                <button
                  key={bm.value}
                  type="button"
                  className={`${styles.benchmarkChip} ${targetRevenue === bm.value ? styles.benchmarkChipActive : ''}`}
                  onClick={() => {
                    setTargetRevenue(bm.value);
                    handleSaveBenchmarks(bm.value, weeklyCap, dailyCap);
                  }}
                >
                  {currencySymbol}{bm.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.capacityGrid}>
            <div className={styles.capacityCol}>
              <span className={styles.capacityLabel}>Weekly Garment Cap</span>
              <div className={styles.stepperRow}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => {
                    const next = Math.max(1, weeklyCap - 1);
                    setWeeklyCap(next);
                    handleSaveBenchmarks(targetRevenue, next, dailyCap);
                  }}
                >
                  -
                </button>
                <span className={styles.stepperVal}>{weeklyCap} / wk</span>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => {
                    const next = weeklyCap + 1;
                    setWeeklyCap(next);
                    handleSaveBenchmarks(targetRevenue, next, dailyCap);
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div className={styles.capacityCol}>
              <span className={styles.capacityLabel}>Daily Cutting Cap</span>
              <div className={styles.stepperRow}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => {
                    const next = Math.max(1, dailyCap - 1);
                    setDailyCap(next);
                    handleSaveBenchmarks(targetRevenue, weeklyCap, next);
                  }}
                >
                  -
                </button>
                <span className={styles.stepperVal}>{dailyCap} / day</span>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => {
                    const next = dailyCap + 1;
                    setDailyCap(next);
                    handleSaveBenchmarks(targetRevenue, weeklyCap, next);
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button
              variant="primary"
              loading={savingCapacity}
              onClick={() => handleSaveBenchmarks(targetRevenue, weeklyCap, dailyCap)}
            >
              Save Benchmarks
            </Button>
          </div>
        </div>

        {/* Group 4: Heartbeat & Streaks */}
        <h3 className={styles.sectionHeader}>Atelier Heartbeat & Streaks</h3>
        <div className={styles.groupCard}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <span className={styles.toggleTitle}>Vacation Mode</span>
              <p className={styles.toggleHint}>
                Pause your daily streak indefinitely while your atelier is closed for holidays or recharge.
              </p>
            </div>
            <label className="toggleSwitch">
              <input
                type="checkbox"
                checked={currentShop?.vacationMode || false}
                onChange={async (e) => {
                  try {
                    await updateShop({ vacationMode: e.target.checked });
                    showToast(e.target.checked ? 'Vacation Mode enabled' : 'Vacation Mode disabled');
                  } catch {
                    showToast('Failed to update Vacation Mode', 'error');
                  }
                }}
              />
              <span className="toggleSlider"></span>
            </label>
          </div>

          <div className={styles.freezeRow}>
            <div className={styles.toggleText}>
              <span className={styles.toggleTitle}>
                Emergency Streak Freezes: {currentShop?.streakFreezes || 0}
              </span>
              <p className={styles.toggleHint}>
                Shields your streak on unplanned workshop disruptions. You also get 2 weekly studio rest days.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                const xp = currentShop?.xp || 0;
                if (xp >= 100) {
                  try {
                    await updateShop({ xp: xp - 100, streakFreezes: (currentShop?.streakFreezes || 0) + 1 });
                    showToast('Acquired 1 emergency Streak Freeze!');
                  } catch {
                    showToast('Failed to update streak freezes', 'error');
                  }
                } else {
                  showToast('You need at least 100 XP to acquire an emergency freeze.', 'error');
                }
              }}
            >
              Get Freeze (100 XP)
            </Button>
          </div>
        </div>
      </div>

      {/* Field Editor Bottom Sheet */}
      <BottomSheet
        isOpen={!!activeField}
        onClose={() => setActiveField(null)}
        title={
          activeField === 'name'
            ? 'Studio Name'
            : activeField === 'about'
            ? 'Atelier Specialty (About)'
            : activeField === 'phone'
            ? 'WhatsApp Business Number'
            : activeField === 'address'
            ? 'Atelier Address'
            : activeField === 'currency'
            ? 'Studio Currency'
            : undefined
        }
        variant="modal"
      >
        <div className={styles.sheetBody}>
          {activeField === 'currency' ? (
            <Select
              label="Select Atelier Currency"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              options={SUPPORTED_CURRENCIES.map((c) => ({
                value: c.code,
                label: c.label,
              }))}
            />
          ) : (
            <Input
              label={
                activeField === 'name'
                  ? 'Studio Name'
                  : activeField === 'about'
                  ? 'Specialty / Tagline'
                  : activeField === 'phone'
                  ? 'Phone Number'
                  : 'Physical Workshop Address'
              }
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder={
                activeField === 'about'
                  ? 'e.g. Master Bespoke Agbada & Senator Tailors'
                  : activeField === 'phone'
                  ? '+234 800 000 0000'
                  : activeField === 'address'
                  ? 'Suite 4, Victoria Island, Lagos'
                  : 'Studio Name'
              }
              autoFocus
            />
          )}

          <p className={styles.sheetHelp}>
            {activeField === 'name' && 'Shown on receipts, invoices, and your public customer portal.'}
            {activeField === 'about' && 'Appears under your studio name on lookbooks and client quotes.'}
            {activeField === 'phone' && 'Used for client communications and invoice headers.'}
            {activeField === 'address' && 'Included on printable cutting slips and client receipts.'}
            {activeField === 'currency' && 'Prices across orders, quotes, and catalog items will display this currency.'}
          </p>

          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setActiveField(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={savingField} onClick={handleSaveField}>
              Save
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={confirmRemoveLogo}
        onClose={() => setConfirmRemoveLogo(false)}
        onConfirm={handleRemoveLogo}
        title="Remove your studio crest?"
        description="Receipts and your public portfolio will display your studio name in text instead."
        confirmLabel="Remove"
      />
    </PageLayout>
  );
}
