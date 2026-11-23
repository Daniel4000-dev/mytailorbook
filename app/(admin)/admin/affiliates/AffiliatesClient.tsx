'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import { AffiliatePerformance, ReferredShopItem } from '@/lib/admin/queries';
import { createAffiliate, toggleAffiliateActive, renameAffiliate, getAffiliateReferredShopsAction } from './actions';
import styles from './AffiliatesClient.module.css';

interface AffiliatesClientProps {
  initialAffiliates: AffiliatePerformance[];
  domain: string;
}

export default function AffiliatesClient({ initialAffiliates, domain }: AffiliatesClientProps) {
  const [affiliates, setAffiliates] = useState<AffiliatePerformance[]>(initialAffiliates);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // New partner state
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<AffiliatePerformance | null>(null);
  const [referredShops, setReferredShops] = useState<ReferredShopItem[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Copy toast state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Keep local state synced if initialAffiliates changes from SSR revalidation
  useEffect(() => {
    setAffiliates(initialAffiliates);
  }, [initialAffiliates]);

  // Telemetry KPIs
  const kpis = useMemo(() => {
    const total = affiliates.length;
    const active = affiliates.filter((a) => a.active).length;
    const signups = affiliates.reduce((sum, a) => sum + (a.signups || 0), 0);
    const premium = affiliates.reduce((sum, a) => sum + (a.premiumConversions || 0), 0);
    const mrr = affiliates.reduce((sum, a) => sum + (a.monthlyRevenueGeneratedNgn || a.premiumConversions * 12500), 0);
    const convRate = signups > 0 ? ((premium / signups) * 100).toFixed(1) : '0';
    const commissionPool = Math.round(mrr * 0.15); // standard 15% commission pool

    return { total, active, signups, premium, mrr, convRate, commissionPool };
  }, [affiliates]);

  // Filtered partners
  const filteredAffiliates = useMemo(() => {
    return affiliates.filter((a) => {
      if (statusFilter === 'active' && !a.active) return false;
      if (statusFilter === 'inactive' && a.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesCode = a.code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [affiliates, statusFilter, searchQuery]);

  // Copy link handler
  function handleCopyLink(code: string) {
    const link = `https://${domain}/?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  // Create partner handler
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startSubmitTransition(async () => {
      const result = await createAffiliate(newName, newCode);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      // Optimistic append
      const normalizedCode = newCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      setAffiliates((prev) => [
        {
          id: `temp-${Date.now()}`,
          name: newName.trim(),
          code: normalizedCode,
          active: true,
          signups: 0,
          premiumConversions: 0,
          monthlyRevenueGeneratedNgn: 0,
        },
        ...prev,
      ]);
      setNewName('');
      setNewCode('');
      setShowAddForm(false);
    });
  }

  // Auto-generate slug suggestion for code as user types partner name
  function handleNameChange(val: string) {
    setNewName(val);
    if (!newCode || newCode === newName.toLowerCase().replace(/[^a-z0-9-]/g, '')) {
      setNewCode(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  }

  // Toggle active status
  function handleToggleStatus(id: string, currentActive: boolean) {
    const nextActive = !currentActive;
    setAffiliates((prev) => prev.map((a) => (a.id === id ? { ...a, active: nextActive } : a)));
    toggleAffiliateActive(id, nextActive).then((res) => {
      if (res?.error) {
        // revert on failure
        setAffiliates((prev) => prev.map((a) => (a.id === id ? { ...a, active: currentActive } : a)));
      }
    });
  }

  // Inline rename save
  function handleSaveRename(id: string) {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) return;

    setAffiliates((prev) => prev.map((a) => (a.id === id ? { ...a, name: trimmed } : a)));
    renameAffiliate(id, trimmed);
  }

  // Open drawer and load attributed shops
  async function openShopsDrawer(partner: AffiliatePerformance) {
    setSelectedPartner(partner);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError(null);

    const res = await getAffiliateReferredShopsAction(partner.id);
    setDrawerLoading(false);
    if (res.error) {
      setDrawerError(res.error);
    } else {
      setReferredShops(res.shops || []);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedPartner(null);
    setReferredShops([]);
  }

  // Close drawer on escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && drawerOpen) {
        closeDrawer();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Partner & Affiliate Marketing</h1>
          <p className={styles.subheading}>
            Track referral links, tailor workshop signups, and subscription conversions with first-touch attribution via <code>?ref=CODE</code>.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.addPartnerBtn}
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            <Symbol name="add" size={18} />
            <span>{showAddForm ? 'Close Form' : 'Add Partner'}</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Partners Network</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="handshake" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiFooter}>
            <span className={styles.badgeSuccess}>{kpis.active} Active</span>
            <span>{kpis.total - kpis.active} Inactive</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Workshops Referred</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="storefront" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>{kpis.signups}</div>
          <div className={styles.kpiFooter}>
            <span className={styles.badgeNeutral}>
              {kpis.total > 0 ? (kpis.signups / kpis.total).toFixed(1) : 0} avg / partner
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Paid Conversions</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="trending_up" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>{kpis.premium}</div>
          <div className={styles.kpiFooter}>
            <span className={styles.badgeSuccess}>{kpis.convRate}% Conv. Rate</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Attributed MRR</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="payments" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>₦{kpis.mrr.toLocaleString()}</div>
          <div className={styles.kpiFooter}>
            <span className={styles.badgeNeutral}>₦{kpis.commissionPool.toLocaleString()} Est. Payout (15%)</span>
          </div>
        </div>
      </div>

      {/* Quick Add Partner Card */}
      {showAddForm && (
        <div className={styles.addCard}>
          <div className={styles.addCardHeader}>
            <div className={styles.addCardTitle}>
              <Symbol name="handshake" size={20} style={{ color: 'var(--sf-accent-emerald)' }} />
              <span>Create New Partner Referral Link</span>
            </div>
            <button
              type="button"
              className={styles.closeAddBtn}
              onClick={() => setShowAddForm(false)}
            >
              <Symbol name="close" size={18} />
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div className={styles.addFormGrid}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Partner Name or Community</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Lagos Tailors Association"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Unique Referral Code</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. lagos-tailors"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={isSubmitting}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Save Partner'}
              </button>
            </div>
            {formError && <p className={styles.formError}>{formError}</p>}
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Symbol name="search" size={16} style={{ color: 'var(--sf-text-secondary)' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search partner name or referral code…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.tabPills}>
          <button
            type="button"
            className={`${styles.tabPill} ${statusFilter === 'all' ? styles.tabPillActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({affiliates.length})
          </button>
          <button
            type="button"
            className={`${styles.tabPill} ${statusFilter === 'active' ? styles.tabPillActive : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({affiliates.filter((a) => a.active).length})
          </button>
          <button
            type="button"
            className={`${styles.tabPill} ${statusFilter === 'inactive' ? styles.tabPillActive : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive ({affiliates.filter((a) => !a.active).length})
          </button>
        </div>
      </div>

      {/* Partners Table */}
      <div className={styles.tableWrap}>
        {filteredAffiliates.length === 0 ? (
          <div className={styles.emptyState}>
            <Symbol name="search" size={32} style={{ color: 'var(--sf-text-secondary)' }} />
            <div className={styles.emptyTitle}>No partners found</div>
            <p>Try refining your search terms or add a new partner referral link above.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Referral Link</th>
                <th>Workshops</th>
                <th>Paid Conversions</th>
                <th>Monthly Revenue</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.map((affiliate) => {
                const isEditing = editingId === affiliate.id;
                const isCopied = copiedCode === affiliate.code;
                const convRate =
                  affiliate.signups > 0
                    ? ((affiliate.premiumConversions / affiliate.signups) * 100).toFixed(0)
                    : 0;

                return (
                  <tr key={affiliate.id}>
                    {/* Partner Name (inline editable) */}
                    <td>
                      <div className={styles.partnerNameWrap}>
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSaveRename(affiliate.id);
                            }}
                            style={{ display: 'inline-flex', gap: 6 }}
                          >
                            <input
                              type="text"
                              className={styles.input}
                              style={{ padding: '2px 8px', fontSize: 13 }}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              onBlur={() => handleSaveRename(affiliate.id)}
                            />
                          </form>
                        ) : (
                          <span
                            className={styles.partnerName}
                            onClick={() => {
                              setEditingId(affiliate.id);
                              setEditValue(affiliate.name);
                            }}
                            title="Click to rename partner"
                          >
                            <span>{affiliate.name}</span>
                            <Symbol name="edit" size={13} style={{ color: 'var(--sf-text-secondary)' }} />
                          </span>
                        )}
                        <div>
                          <span className={styles.codeBadge}>ref={affiliate.code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Copy Link */}
                    <td>
                      <div className={styles.linkBox}>
                        <span className={styles.linkText}>
                          {domain}/?ref={affiliate.code}
                        </span>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopyLink(affiliate.code)}
                          title="Copy full referral URL"
                        >
                          <Symbol
                            name={isCopied ? 'check' : 'content_copy'}
                            size={14}
                            style={isCopied ? { color: '#10b981' } : undefined}
                          />
                        </button>
                      </div>
                    </td>

                    {/* Signups */}
                    <td>
                      <button
                        type="button"
                        className={`${styles.statPill} ${styles.statPillNeutral}`}
                        onClick={() => openShopsDrawer(affiliate)}
                        title="Click to inspect referred tailor shops"
                      >
                        <Symbol name="storefront" size={13} />
                        <span>{affiliate.signups} shops</span>
                      </button>
                    </td>

                    {/* Paid Conversions */}
                    <td>
                      <span
                        className={`${styles.statPill} ${
                          affiliate.premiumConversions > 0 ? styles.statPillPremium : styles.statPillNeutral
                        }`}
                      >
                        <Symbol name="trending_up" size={13} />
                        <span>{affiliate.premiumConversions} paid</span>
                        {affiliate.signups > 0 && <span>({convRate}%)</span>}
                      </span>
                    </td>

                    {/* Monthly Revenue */}
                    <td>
                      <strong>
                        ₦
                        {(
                          affiliate.monthlyRevenueGeneratedNgn ??
                          affiliate.premiumConversions * 12500
                        ).toLocaleString()}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--sf-text-secondary)' }}>/mo</span>
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
                        <span
                          className={`${styles.statusDot} ${
                            affiliate.active ? styles.statusActive : styles.statusInactive
                          }`}
                        />
                        {affiliate.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actionBtnGroup}>
                        <button
                          type="button"
                          className={styles.inspectBtn}
                          onClick={() => openShopsDrawer(affiliate)}
                        >
                          <span>Inspect Shops</span>
                          <Symbol name="arrow_forward" size={14} />
                        </button>

                        <button
                          type="button"
                          className={styles.toggleBtn}
                          onClick={() => handleToggleStatus(affiliate.id, affiliate.active)}
                        >
                          {affiliate.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-Over Drawer: Referred Tailor Workshops */}
      {drawerOpen && selectedPartner && (
        <div className={styles.drawerBackdrop} onClick={closeDrawer}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleGroup}>
                <h2 className={styles.drawerTitle}>
                  <span>{selectedPartner.name}</span>
                  <span className={styles.codeBadge}>ref={selectedPartner.code}</span>
                </h2>
                <p className={styles.drawerSubtitle}>
                  Attributed tailor workshops and fashion businesses that registered through this link.
                </p>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={closeDrawer}
                aria-label="Close drawer"
              >
                <Symbol name="close" size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className={styles.drawerBody}>
              {/* Quick Partner Summary Strip */}
              <div className={styles.drawerStatsBar}>
                <div className={styles.drawerStatItem}>
                  <span className={styles.drawerStatVal}>{selectedPartner.signups}</span>
                  <span className={styles.drawerStatLbl}>Total Signups</span>
                </div>
                <div className={styles.drawerStatItem}>
                  <span className={styles.drawerStatVal}>{selectedPartner.premiumConversions}</span>
                  <span className={styles.drawerStatLbl}>Paid Upgrades</span>
                </div>
                <div className={styles.drawerStatItem}>
                  <span className={styles.drawerStatVal}>
                    ₦
                    {(
                      selectedPartner.monthlyRevenueGeneratedNgn ??
                      selectedPartner.premiumConversions * 12500
                    ).toLocaleString()}
                  </span>
                  <span className={styles.drawerStatLbl}>Attributed MRR</span>
                </div>
              </div>

              {/* Loading Skeletons */}
              {drawerLoading && (
                <>
                  <div className={styles.skeletonCard}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLineShort} />
                  </div>
                  <div className={styles.skeletonCard}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLineShort} />
                  </div>
                </>
              )}

              {/* Error Message */}
              {drawerError && (
                <div className={styles.formError}>
                  <Symbol name="error" size={16} />
                  <span>{drawerError}</span>
                </div>
              )}

              {/* Empty State */}
              {!drawerLoading && !drawerError && referredShops.length === 0 && (
                <div className={styles.emptyState}>
                  <Symbol name="storefront" size={32} style={{ color: 'var(--sf-text-secondary)' }} />
                  <div className={styles.emptyTitle}>No workshops attributed yet</div>
                  <p>
                    Share <code>https://{domain}/?ref={selectedPartner.code}</code> with tailor shops to start tracking conversions.
                  </p>
                </div>
              )}

              {/* List of Referred Shops */}
              {!drawerLoading &&
                referredShops.map((shop) => {
                  const isPremium =
                    shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trialing';

                  return (
                    <div key={shop.id} className={styles.shopCard}>
                      <div className={styles.shopTop}>
                        <div>
                          <div className={styles.shopName}>{shop.name}</div>
                          {shop.ownerEmail && (
                            <div className={styles.shopEmail}>{shop.ownerEmail}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className={styles.badgeMode}>{shop.businessMode}</span>
                          <span
                            className={`${styles.badgePlan} ${
                              isPremium ? styles.badgePlanActive : styles.badgePlanFree
                            }`}
                          >
                            {isPremium ? 'Premium' : 'Free Tier'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.shopMetaRow}>
                        <span>
                          {shop.customerCount} Clients • {shop.orderCount} Orders
                        </span>
                        <Link
                          href={`/admin/organizations/${shop.id}`}
                          className={styles.dossierLink}
                          target="_blank"
                        >
                          <span>Open Dossier</span>
                          <Symbol name="arrow_forward" size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
