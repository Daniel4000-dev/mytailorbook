'use client';

import { useState, useTransition } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import { PlatformSettings, DEFAULT_PLATFORM_SETTINGS } from '@/lib/admin/platformSettingsTypes';
import { savePlatformSettingsAction, resetPlatformSettingsAction } from './actions';
import styles from './SettingsClient.module.css';

interface SettingsClientProps {
  initialSettings: PlatformSettings;
}

type TabType = 'features' | 'templates' | 'banner' | 'plans';

type TemplateKey = keyof PlatformSettings['notificationTemplates'];

const TEMPLATE_STAGES: { key: TemplateKey; label: string; desc: string }[] = [
  {
    key: 'orderIntake',
    label: '1. Order Intake & Measurement',
    desc: 'Sent immediately when an order is created and client measurements are saved.',
  },
  {
    key: 'cuttingAndSewing',
    label: '2. Cutting & Sewing Progress',
    desc: 'Sent when fabric is chalked/cut and tailoring begins on the sewing machine.',
  },
  {
    key: 'fittingReady',
    label: '3. Fitting Consultation Ready',
    desc: 'Sent when the basted garment is ready for first or second fitting consultation.',
  },
  {
    key: 'readyForPickup',
    label: '4. Ready for Pickup / Delivery',
    desc: 'Sent when tailoring, pressing, and packaging are completely finished.',
  },
  {
    key: 'paymentReminder',
    label: '5. Balance Due Reminder',
    desc: 'Sent to clients who have an outstanding deposit or balance due on pickup.',
  },
];

const AVAILABLE_TAGS = [
  { tag: '{customer_name}', label: 'Customer Name' },
  { tag: '{shop_name}', label: 'Tailor Shop Name' },
  { tag: '{order_id}', label: 'Order ID' },
  { tag: '{garment_type}', label: 'Garment Type' },
  { tag: '{deposit_amount}', label: 'Deposit Amount' },
  { tag: '{balance_due}', label: 'Balance Due' },
  { tag: '{tracking_link}', label: 'Live Tracking URL' },
];

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('features');
  const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('orderIntake');
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleSave() {
    setBanner(null);
    startTransition(async () => {
      const res = await savePlatformSettingsAction(settings);
      if (res.success) {
        setBanner({ type: 'success', text: res.message || 'Settings saved successfully.' });
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to save settings.' });
      }
    });
  }

  function handleReset() {
    const confirm = window.confirm(
      'Are you sure you want to restore all platform settings and notification templates back to system factory defaults?'
    );
    if (!confirm) return;

    setBanner(null);
    startTransition(async () => {
      const res = await resetPlatformSettingsAction();
      if (res.success) {
        setSettings(DEFAULT_PLATFORM_SETTINGS);
        setBanner({ type: 'success', text: res.message || 'Settings reset to factory defaults.' });
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to reset settings.' });
      }
    });
  }

  function insertTag(tag: string) {
    const current = settings.notificationTemplates[activeTemplate] || '';
    setSettings({
      ...settings,
      notificationTemplates: {
        ...settings.notificationTemplates,
        [activeTemplate]: `${current} ${tag}`.trim(),
      },
    });
  }

  // Format sample interpolated message for preview
  function getPreviewMessage(template: string) {
    return template
      .replace(/{customer_name}/g, 'Alhaji Musa')
      .replace(/{shop_name}/g, 'De-Classic Stitches')
      .replace(/{order_id}/g, 'ORD-408')
      .replace(/{garment_type}/g, 'Three-Piece Agbada')
      .replace(/{deposit_amount}/g, '35,000')
      .replace(/{balance_due}/g, '15,000')
      .replace(/{tracking_link}/g, 'https://mystitchbook.com/track/408');
  }

  return (
    <div className={styles.container}>
      {/* ── Top Header & Actions ── */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Platform Settings & Customizations</h1>
          <p className={styles.subheading}>
            Control global feature switches, automated WhatsApp templates, announcement banners, and tier limits.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            disabled={isPending}
            onClick={handleReset}
            className={styles.resetBtn}
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className={styles.saveBtn}
          >
            <Symbol name="save" size={15} />
            <span>{isPending ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ── Status Feedback Banner ── */}
      {banner && (
        <div
          className={`${styles.banner} ${
            banner.type === 'success' ? styles.bannerSuccess : styles.bannerError
          }`}
        >
          <Symbol name={banner.type === 'success' ? 'check_circle' : 'error'} size={16} />
          <span>{banner.text}</span>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className={styles.tabNav}>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`${styles.tabBtn} ${activeTab === 'features' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="tune" size={14} />
          <span>Feature Switches</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`${styles.tabBtn} ${activeTab === 'templates' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="chat" size={14} />
          <span>WhatsApp & Notification Templates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banner')}
          className={`${styles.tabBtn} ${activeTab === 'banner' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="campaign" size={14} />
          <span>Announcement Banner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`${styles.tabBtn} ${activeTab === 'plans' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="payments" size={14} />
          <span>Plan Limits & Pricing</span>
        </button>
      </div>

      {/* ── TAB 1: Feature Switches & Modes ── */}
      {activeTab === 'features' && (
        <div className={styles.panelCard}>
          <div className={styles.sectionBlock}>
            <h3 className={styles.blockTitle}>Operational Feature Switches</h3>
            <p className={styles.blockDesc}>
              Instantly enable, restrict, or pause key platform modules across all tailor shops.
            </p>
          </div>

          {/* RTW Feature Flag */}
          <div className={styles.toggleCard}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>Ready-to-Wear (RTW) Production Module</span>
              <span className={styles.toggleHint}>
                Standard apparel size variants (S/M/L/XL), bulk batch runs, and rack inventory tracking.
              </span>
            </div>
            <div className={styles.segmentedGroup}>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    featureFlags: { ...settings.featureFlags, rtwModuleStatus: 'active' },
                  })
                }
                className={`${styles.segmentBtn} ${
                  settings.featureFlags.rtwModuleStatus === 'active' ? styles.segmentBtnActive : ''
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    featureFlags: { ...settings.featureFlags, rtwModuleStatus: 'beta_only' },
                  })
                }
                className={`${styles.segmentBtn} ${
                  settings.featureFlags.rtwModuleStatus === 'beta_only' ? styles.segmentBtnActive : ''
                }`}
              >
                Beta Only
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    featureFlags: { ...settings.featureFlags, rtwModuleStatus: 'disabled' },
                  })
                }
                className={`${styles.segmentBtn} ${
                  settings.featureFlags.rtwModuleStatus === 'disabled' ? styles.segmentBtnActive : ''
                }`}
              >
                Paused
              </button>
            </div>
          </div>

          {/* Streaks Engine Toggle */}
          <div className={styles.toggleCard}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>Daily Streaks & Gamification Engine</span>
              <span className={styles.toggleHint}>
                Tracks tailor consistency, daily order completions, freezes, and rewards.
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.featureFlags.streakGamificationEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureFlags: {
                      ...settings.featureFlags,
                      streakGamificationEnabled: e.target.checked,
                    },
                  })
                }
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* Public Lookbook Toggle */}
          <div className={styles.toggleCard}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>Public Portfolio & Catalogue Links</span>
              <span className={styles.toggleHint}>
                Allows fashion designers to generate shareable showcase links for prospective customers.
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.featureFlags.publicLookbookEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureFlags: {
                      ...settings.featureFlags,
                      publicLookbookEnabled: e.target.checked,
                    },
                  })
                }
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* WhatsApp Direct Toggle */}
          <div className={styles.toggleCard}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>WhatsApp Direct Quick-Messaging</span>
              <span className={styles.toggleHint}>
                Generates pre-filled WhatsApp links for customer order milestones and tracking.
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.featureFlags.whatsappDirectEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureFlags: {
                      ...settings.featureFlags,
                      whatsappDirectEnabled: e.target.checked,
                    },
                  })
                }
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* Maintenance Mode */}
          <div className={styles.toggleCard}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle} style={{ color: '#dc2626' }}>
                Platform Maintenance Mode
              </span>
              <span className={styles.toggleHint}>
                Displays an emergency maintenance banner at the top of all tailor shop screens.
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.featureFlags.maintenanceMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureFlags: {
                      ...settings.featureFlags,
                      maintenanceMode: e.target.checked,
                    },
                  })
                }
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {settings.featureFlags.maintenanceMode && (
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Maintenance Banner Message</label>
              <textarea
                className={styles.fieldTextarea}
                value={settings.featureFlags.maintenanceMessage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureFlags: {
                      ...settings.featureFlags,
                      maintenanceMessage: e.target.value,
                    },
                  })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Notification & WhatsApp Templates ── */}
      {activeTab === 'templates' && (
        <div className={styles.panelCard}>
          <div className={styles.sectionBlock}>
            <h3 className={styles.blockTitle}>Automated WhatsApp & Notification Templates</h3>
            <p className={styles.blockDesc}>
              Customize the default messaging sent to clients throughout the garment making journey. Tailors can also preview these in real-time.
            </p>
          </div>

          {/* Stage Selector Chips */}
          <div className={styles.templateSelectorBar}>
            {TEMPLATE_STAGES.map((stage) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => setActiveTemplate(stage.key)}
                className={`${styles.templateChip} ${
                  activeTemplate === stage.key ? styles.templateChipActive : ''
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>

          <p className={styles.blockDesc}>
            <strong>Stage Context:</strong>{' '}
            {TEMPLATE_STAGES.find((s) => s.key === activeTemplate)?.desc}
          </p>

          {/* Insertable Tag Chips */}
          <div className={styles.tagPillsRow}>
            <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)', marginRight: '4px' }}>
              Insert Placeholders:
            </span>
            {AVAILABLE_TAGS.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => insertTag(t.tag)}
                className={styles.tagPillBtn}
                title={`Insert ${t.label}`}
              >
                + {t.tag}
              </button>
            ))}
          </div>

          {/* Template Textarea */}
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Template Text</label>
            <textarea
              className={styles.fieldTextarea}
              rows={4}
              value={settings.notificationTemplates[activeTemplate] || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notificationTemplates: {
                    ...settings.notificationTemplates,
                    [activeTemplate]: e.target.value,
                  },
                })
              }
            />
          </div>

          {/* Live WhatsApp Chat Bubble Preview */}
          <div>
            <span className={styles.fieldLabel}>Live WhatsApp Client Preview</span>
            <div className={styles.previewBox}>
              <div className={styles.whatsappBubble}>
                {getPreviewMessage(settings.notificationTemplates[activeTemplate] || '')}
                <div className={styles.whatsappFooter}>
                  <span>10:42 AM</span>
                  <span style={{ color: '#3b82f6' }}>✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Global Announcement Bar ── */}
      {activeTab === 'banner' && (
        <div className={styles.panelCard}>
          <div className={styles.sectionBlock}>
            <h3 className={styles.blockTitle}>Global Top Announcement Bar</h3>
            <p className={styles.blockDesc}>
              Publish a highlighted announcement ribbon pinned to the top of every shop dashboard across Nigeria.
            </p>
          </div>

          {/* Live Banner Preview */}
          <div>
            <span className={styles.fieldLabel} style={{ marginBottom: '6px', display: 'block' }}>
              Live Ribbon Preview {settings.announcementBar.enabled ? '(Active)' : '(Hidden)'}
            </span>
            <div
              className={`${styles.bannerPreview} ${
                settings.announcementBar.theme === 'amber'
                  ? styles.bannerAmber
                  : settings.announcementBar.theme === 'green'
                  ? styles.bannerGreen
                  : settings.announcementBar.theme === 'red'
                  ? styles.bannerRed
                  : styles.bannerInfo
              }`}
            >
              <span>{settings.announcementBar.text || 'Enter announcement message…'}</span>
              {settings.announcementBar.actionText && (
                <button type="button" className={styles.bannerActionBtn}>
                  {settings.announcementBar.actionText} →
                </button>
              )}
            </div>
          </div>

          {/* Active Switch */}
          <div className={styles.toggleCard}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>Display Announcement Bar</span>
              <span className={styles.toggleHint}>
                Turn on to immediately show this banner to all logged-in fashion designers and tailors.
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.announcementBar.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBar: {
                      ...settings.announcementBar,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Color Theme</label>
              <select
                className={styles.fieldSelect}
                value={settings.announcementBar.theme}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBar: {
                      ...settings.announcementBar,
                      theme: e.target.value as 'info' | 'amber' | 'green' | 'red',
                    },
                  })
                }
              >
                <option value="info">Information (Blue)</option>
                <option value="amber">Notice / Holiday Reminder (Amber)</option>
                <option value="green">Celebration / Good News (Green)</option>
                <option value="red">Urgent Advisory (Red)</option>
              </select>
            </div>

            <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.fieldLabel}>Announcement Copy</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={settings.announcementBar.text}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBar: {
                      ...settings.announcementBar,
                      text: e.target.value,
                    },
                  })
                }
                placeholder="e.g. Eid Mubarak to all fashion entrepreneurs! Wishing you seamless deliveries."
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Button Text (Optional)</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={settings.announcementBar.actionText || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBar: {
                      ...settings.announcementBar,
                      actionText: e.target.value,
                    },
                  })
                }
                placeholder="e.g. View Sizing Guide"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Button Link URL (Optional)</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={settings.announcementBar.actionUrl || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBar: {
                      ...settings.announcementBar,
                      actionUrl: e.target.value,
                    },
                  })
                }
                placeholder="e.g. /blog/aso-ebi-guide-nigerian-weddings"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Plan Limits & Pricing ── */}
      {activeTab === 'plans' && (
        <div className={styles.panelCard}>
          <div className={styles.sectionBlock}>
            <h3 className={styles.blockTitle}>Free Plan Quotas & Pricing Parameters</h3>
            <p className={styles.blockDesc}>
              Configure maximum limits enforced on free accounts and set default pricing reference points.
            </p>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Free Monthly Orders Limit</label>
              <input
                type="number"
                min="1"
                max="1000"
                className={styles.fieldInput}
                value={settings.planLimits.freeOrdersPerMonth}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      freeOrdersPerMonth: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Free Client Profiles Limit</label>
              <input
                type="number"
                min="1"
                max="1000"
                className={styles.fieldInput}
                value={settings.planLimits.freeCustomersLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      freeCustomersLimit: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Free Staff Accounts Limit</label>
              <input
                type="number"
                min="1"
                max="50"
                className={styles.fieldInput}
                value={settings.planLimits.freeStaffSeats}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      freeStaffSeats: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Grace Period (Days)</label>
              <input
                type="number"
                min="1"
                max="30"
                className={styles.fieldInput}
                value={settings.planLimits.gracePeriodDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      gracePeriodDays: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Starter Plan Monthly (₦)</label>
              <input
                type="number"
                min="500"
                step="500"
                className={styles.fieldInput}
                value={settings.planLimits.starterPriceNgn}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      starterPriceNgn: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Growth Plan Monthly (₦)</label>
              <input
                type="number"
                min="1000"
                step="500"
                className={styles.fieldInput}
                value={settings.planLimits.growthPriceNgn}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      growthPriceNgn: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Pro Plan Monthly (₦)</label>
              <input
                type="number"
                min="2000"
                step="500"
                className={styles.fieldInput}
                value={settings.planLimits.proPriceNgn}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    planLimits: {
                      ...settings.planLimits,
                      proPriceNgn: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
