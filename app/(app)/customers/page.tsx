'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserSlash, FaPhone, FaChevronRight, FaWhatsapp } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import SearchBar from '@/components/ui/SearchBar/SearchBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatPhone, formatCurrency, formatShortMonthYear, formatDate, getWhatsAppLink } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import type { Customer } from '@/lib/types';
import { GARMENT_STYLES } from '@/lib/constants';
import { getStylePhotoSubmissionsAction, getOutreachLogAction, logOutreachContactAction } from '@/app/actions';
import type { StylePhotoSubmission } from '@/lib/types';
import { shareStylePhoto } from '@/lib/share-outreach';
import CustomersSkeleton from './CustomersSkeleton';
import styles from './page.module.css';

const PAGE_SIZE = 40;
type GenderFilter = 'all' | 'male' | 'female';

export default function CustomersPage() {
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { currentShop, customers, orders, isLoaded } = useData();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);

  // Outreach: this style's saved (owner-approved) photos, and who's already
  // been contacted about it — fetched fresh whenever the active style
  // changes, one query each, never per customer row.
  const [savedPhotos, setSavedPhotos] = useState<StylePhotoSubmission[]>([]);
  const [outreachMap, setOutreachMap] = useState<Record<string, string>>({});
  const [isOutreachSheetOpen, setIsOutreachSheetOpen] = useState(false);
  const [outreachStep, setOutreachStep] = useState<'compose' | 'queue'>('compose');
  const [selectedPhoto, setSelectedPhoto] = useState<StylePhotoSubmission | null>(null);
  const [noteText, setNoteText] = useState('');
  const [queueList, setQueueList] = useState<Customer[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [includeContacted, setIncludeContacted] = useState(false);

  // Reset immediately when the active style changes — adjusted during
  // render rather than in the effect below, which only handles the actual
  // (async) fetch once a style is selected.
  const [prevStyleFilter, setPrevStyleFilter] = useState(styleFilter);
  if (styleFilter !== prevStyleFilter) {
    setPrevStyleFilter(styleFilter);
    setSavedPhotos([]);
    setOutreachMap({});
  }

  useEffect(() => {
    if (!styleFilter || !currentShop?.id) return;
    getStylePhotoSubmissionsAction(currentShop.id, styleFilter).then(({ saved }) => setSavedPhotos(saved));
    getOutreachLogAction(currentShop.id, styleFilter).then((entries) => {
      const map: Record<string, string> = {};
      // Entries come back newest-first — first write per customer wins, i.e. the latest.
      entries.forEach((e) => {
        if (!map[e.customerId]) map[e.customerId] = e.contactedAt;
      });
      setOutreachMap(map);
    });
  }, [styleFilter, currentShop]);

  // Calculate order stats per customer
  const customerStats = useMemo(() => {
    const stats: Record<string, { totalOrders: number; activeOrders: number; totalSpend: number; totalBalance: number }> = {};
    
    customers.forEach(c => {
      stats[c.id] = { totalOrders: 0, activeOrders: 0, totalSpend: 0, totalBalance: 0 };
    });

    orders.forEach(o => {
      if (stats[o.customerId]) {
        stats[o.customerId].totalOrders += 1;
        if (o.status !== 'Completed') {
          stats[o.customerId].activeOrders += 1;
        }
        stats[o.customerId].totalSpend += o.totalBill;
        stats[o.customerId].totalBalance += getBalanceOwed(o);
      }
    });
    return stats;
  }, [customers, orders]);

  // Rows are plain divs/<tr>s (not <Link>), so Next never gets a chance to
  // prefetch these routes on its own — warm them proactively instead of
  // waiting for the click, capped so a very large customer book doesn't
  // fire an unbounded burst of requests.
  useEffect(() => {
    if (!isLoaded) return;
    customers.slice(0, 60).forEach((c) => router.prefetch(`/customers/${c.id}`));
  }, [isLoaded, customers, router]);

  // A new search/filter should start back at the first page rather than
  // staying scrolled deep into a now-irrelevant "load more" position.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setVisibleCount(PAGE_SIZE), [search, genderFilter, styleFilter]);

  // Styles offered in the filter sheet are only ones actually in use by this
  // shop's own customers (scoped to the active gender filter) — never the
  // full static catalog, so a tailor never picks a style that returns zero
  // results. Each resolves to its catalog photo when it's a built-in style;
  // custom styles (free text, no catalog entry) fall back to a text-only chip.
  const availableStyles = useMemo(() => {
    const scoped = genderFilter === 'all' ? customers : customers.filter((c) => c.gender === genderFilter);
    const names = new Set<string>();
    scoped.forEach((c) => c.preferredStyles?.forEach((s) => names.add(s)));
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, photoUrl: GARMENT_STYLES.find((g) => g.name === name)?.photoUrl }));
  }, [customers, genderFilter]);

  const openOutreachSheet = () => {
    setOutreachStep('compose');
    setSelectedPhoto(savedPhotos[0] || null);
    setNoteText(`Hi {name}, thought you'd love this ${styleFilter} style!`);
    setIncludeContacted(false);
    setIsOutreachSheetOpen(true);
  };

  const startQueue = (list: Customer[]) => {
    setQueueList(list);
    setQueueIndex(0);
    setOutreachStep('queue');
  };

  const closeOutreachSheet = () => {
    setIsOutreachSheetOpen(false);
    setQueueList([]);
    setQueueIndex(0);
  };

  const handleShareToCurrent = useCallback(async () => {
    const customer = queueList[queueIndex];
    if (!customer || !selectedPhoto || !styleFilter || !currentShop?.id || !user) return;
    setSharing(true);
    try {
      const personalNote = noteText.replace(/\{name\}/g, customer.fullName.split(' ')[0]);
      const result = await shareStylePhoto(selectedPhoto.photoUrl, personalNote);
      if (result === 'shared') {
        await logOutreachContactAction(currentShop.id, customer.id, styleFilter, user.uid);
        setOutreachMap((prev) => ({ ...prev, [customer.id]: new Date().toISOString() }));
        showToast(`Shared with ${customer.fullName}`, 'success');
        setQueueIndex((i) => i + 1);
      } else if (result === 'unsupported') {
        window.open(getWhatsAppLink(customer.whatsappNumber, personalNote), '_blank');
        showToast('Photo sharing isn’t supported here — sent the note only. Attach the photo yourself, then mark as sent.', 'info');
      }
      // 'cancelled': user backed out of the share sheet — stay put, no toast.
    } catch {
      showToast('Could not open the share sheet', 'error');
    } finally {
      setSharing(false);
    }
  }, [queueList, queueIndex, selectedPhoto, styleFilter, currentShop, user, noteText, showToast]);

  const handleMarkSentManually = useCallback(async () => {
    const customer = queueList[queueIndex];
    if (!customer || !styleFilter || !currentShop?.id || !user) return;
    await logOutreachContactAction(currentShop.id, customer.id, styleFilter, user.uid);
    setOutreachMap((prev) => ({ ...prev, [customer.id]: new Date().toISOString() }));
    setQueueIndex((i) => i + 1);
  }, [queueList, queueIndex, styleFilter, currentShop, user]);

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customers" />}>
        <EmptyState icon={<FaUserSlash />} title="Access Denied" description="Only owners can view the customer directory." />
      </PageLayout>
    );
  }

  if (!isLoaded) {
    return (
      <PageLayout header={<TopBar title="Customers" />}>
        <CustomersSkeleton />
      </PageLayout>
    );
  }

  const filtered = customers.filter((c) => {
    if (genderFilter !== 'all' && c.gender !== genderFilter) return false;
    if (styleFilter && !c.preferredStyles?.includes(styleFilter)) return false;
    const q = search.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.whatsappNumber.includes(q);
  });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => customerStats[c.id]?.activeOrders > 0).length;

  return (
    <PageLayout header={<TopBar title="Customers" />}>
        
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalCustomers}</div>
            <div className={styles.statLabel}>Total Customers</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{activeCustomers}</div>
            <div className={styles.statLabel}>Active Orders</div>
          </div>
        </div>

        <div className={styles.actionArea}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone..." />
        </div>

        <div className={styles.pillRow}>
          <FilterPill label="All" active={genderFilter === 'all'} onClick={() => setGenderFilter('all')} />
          <FilterPill
            label="Male"
            active={genderFilter === 'male'}
            onClick={() => {
              setGenderFilter('male');
              if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'male')) {
                setStyleFilter(null);
              }
            }}
          />
          <FilterPill
            label="Female"
            active={genderFilter === 'female'}
            onClick={() => {
              setGenderFilter('female');
              if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'female')) {
                setStyleFilter(null);
              }
            }}
          />
          <FilterPill
            label={styleFilter || 'Style'}
            active={!!styleFilter}
            onClick={() => setIsStyleSheetOpen(true)}
          />
        </div>

        <BottomSheet isOpen={isStyleSheetOpen} onClose={() => setIsStyleSheetOpen(false)} title="Filter by Style">
          {availableStyles.length === 0 ? (
            <p className={styles.noStylesHint}>No preferred styles recorded yet for this filter.</p>
          ) : (
            <div className={styles.styleFilterGrid}>
              {availableStyles.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={`${styles.styleFilterCard} ${styleFilter === s.name ? styles.styleFilterCardSelected : ''}`}
                  onClick={() => {
                    setStyleFilter(styleFilter === s.name ? null : s.name);
                    setIsStyleSheetOpen(false);
                  }}
                >
                  {s.photoUrl ? (
                    <div className={styles.styleFilterPhoto}>
                      <img src={s.photoUrl} alt="" />
                    </div>
                  ) : (
                    <div className={styles.styleFilterPhoto} aria-hidden="true" />
                  )}
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </BottomSheet>

        {styleFilter && (
          savedPhotos.length > 0 ? (
            <button type="button" className={styles.reachOutBar} onClick={openOutreachSheet}>
              <Symbol name="ios_share" size={18} />
              <span>Reach out to {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'} about {styleFilter}</span>
            </button>
          ) : (
            <a href={`/styles/${encodeURIComponent(styleFilter)}`} className={styles.reachOutHint}>
              No approved photos yet for {styleFilter} — add one in Style Gallery
            </a>
          )
        )}

        <BottomSheet
          isOpen={isOutreachSheetOpen}
          onClose={closeOutreachSheet}
          title={outreachStep === 'compose' ? `Reach Out — ${styleFilter}` : undefined}
        >
          {outreachStep === 'compose' ? (
            <div className={styles.composeWrap}>
              <span className={styles.composeLabel}>Choose a photo</span>
              <div className={styles.styleFilterGrid}>
                {savedPhotos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.styleFilterCard} ${selectedPhoto?.id === p.id ? styles.styleFilterCardSelected : ''}`}
                    onClick={() => setSelectedPhoto(p)}
                  >
                    <div className={styles.styleFilterPhoto}>
                      <img src={p.photoUrl} alt="" />
                    </div>
                  </button>
                ))}
              </div>
              <span className={styles.composeLabel}>Note (use {'{name}'} to insert each customer&apos;s first name)</span>
              <textarea
                className={styles.noteInput}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
              />
              {(() => {
                const notYetContacted = filtered.filter((c) => !outreachMap[c.id]);
                const queueTarget = includeContacted ? filtered : notYetContacted;
                return (
                  <>
                    {filtered.length > notYetContacted.length && (
                      <label className={styles.includeContactedRow}>
                        <input
                          type="checkbox"
                          checked={includeContacted}
                          onChange={(e) => setIncludeContacted(e.target.checked)}
                        />
                        Include the {filtered.length - notYetContacted.length} already contacted
                      </label>
                    )}
                    <button
                      type="button"
                      className={styles.startBtn}
                      disabled={!selectedPhoto || queueTarget.length === 0}
                      onClick={() => startQueue(queueTarget)}
                    >
                      {queueTarget.length === 0
                        ? 'Everyone here has already been contacted'
                        : `Start (${queueTarget.length} ${queueTarget.length === 1 ? 'customer' : 'customers'})`}
                    </button>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className={styles.queueWrap}>
              {queueIndex >= queueList.length ? (
                <div className={styles.queueDone}>
                  <Symbol name="check_circle" size={40} />
                  <p>All done — reached out to everyone in this list.</p>
                  <button type="button" className={styles.startBtn} onClick={closeOutreachSheet}>Close</button>
                </div>
              ) : (
                <>
                  <p className={styles.queuePosition}>Customer {queueIndex + 1} of {queueList.length}</p>
                  <div className={styles.queueCard}>
                    <Avatar name={queueList[queueIndex].fullName} size="md" />
                    <div>
                      <p className={styles.queueName}>{queueList[queueIndex].fullName}</p>
                      <p className={styles.queuePhone}>{formatPhone(queueList[queueIndex].whatsappNumber)}</p>
                      {outreachMap[queueList[queueIndex].id] && (
                        <span className={styles.contactedTag}>
                          Already reached out {formatDate(outreachMap[queueList[queueIndex].id])}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedPhoto && (
                    <div className={styles.queuePreviewPhoto}>
                      <img src={selectedPhoto.photoUrl} alt="" />
                    </div>
                  )}
                  <p className={styles.queueNotePreview}>
                    {noteText.replace(/\{name\}/g, queueList[queueIndex].fullName.split(' ')[0])}
                  </p>
                  <div className={styles.queueActions}>
                    <button type="button" className={styles.skipBtn} onClick={() => setQueueIndex((i) => i + 1)}>
                      Skip
                    </button>
                    <button type="button" className={styles.shareBtn} disabled={sharing} onClick={handleShareToCurrent}>
                      <Symbol name="ios_share" size={18} /> Share
                    </button>
                  </div>
                  <button type="button" className={styles.markSentLink} onClick={handleMarkSentManually}>
                    Already sent this manually — just mark as contacted
                  </button>
                </>
              )}
            </div>
          )}
        </BottomSheet>

        {filtered.length === 0 ? (
          customers.length === 0 ? (
            <EmptyState
              icon={<FaUserSlash />}
              title="No customers yet"
              description="Your customer book starts with your first order — create one and the customer is saved here automatically."
            />
          ) : (
            <EmptyState icon={<FaUserSlash />} title="No customers found" description="Try a different search or filter" />
          )
        ) : (
          <>
            {/* Mobile View */}
            <div className={styles.mobileList}>
              {filtered.slice(0, visibleCount).map((c, i) => {
                const stats = customerStats[c.id];
                return (
                  <div key={c.id} className={styles.mobileCard} style={{ animationDelay: `${Math.min(i, 20) * 0.04}s` }} onClick={() => router.push(`/customers/${c.id}`)}>
                    <div className={styles.cardHeader}>
                      <Avatar name={c.fullName} size="md" />
                      <div className={styles.cardInfo}>
                        <span className={styles.name}>{c.fullName}</span>
                        <span className={styles.phone}>{formatPhone(c.whatsappNumber)}</span>
                        <span className={styles.addedDate}>Added {formatShortMonthYear(c.createdAt)}</span>
                        {styleFilter && (
                          <span className={`${styles.contactBadge} ${outreachMap[c.id] ? styles.contactBadgeDone : ''}`}>
                            {outreachMap[c.id] ? `Reached out ${formatDate(outreachMap[c.id])}` : 'Not yet contacted'}
                          </span>
                        )}
                      </div>
                      <div className={styles.cardActionIcon}>
                        <FaChevronRight />
                      </div>
                    </div>
                    <div className={styles.cardMetrics}>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Orders</span>
                        <span className={styles.metricValue}>{stats.totalOrders}</span>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Spend</span>
                        <span className={styles.metricValue}>{formatCurrency(stats.totalSpend)}</span>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Balance</span>
                        <span className={`${styles.metricValue} ${stats.totalBalance > 0 ? styles.hasBalance : ''}`}>
                          {formatCurrency(stats.totalBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className={styles.desktopTableContainer}>
              <table className={styles.desktopTable}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Orders (Active)</th>
                    <th>Total Spend</th>
                    <th>Balance</th>
                    <th className={styles.alignRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, visibleCount).map((c, i) => {
                    const stats = customerStats[c.id];
                    return (
                      <tr key={c.id} className={styles.tableRow} style={{ animationDelay: `${Math.min(i, 20) * 0.04}s` }} onClick={() => router.push(`/customers/${c.id}`)}>
                        <td>
                          <div className={styles.customerCell}>
                            <Avatar name={c.fullName} size="sm" />
                            <span className={styles.name}>{c.fullName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.phone}>{formatPhone(c.whatsappNumber)}</span>
                          <span className={styles.addedDate}>Added {formatShortMonthYear(c.createdAt)}</span>
                          {styleFilter && (
                            <span className={`${styles.contactBadge} ${outreachMap[c.id] ? styles.contactBadgeDone : ''}`}>
                              {outreachMap[c.id] ? `Reached out ${formatDate(outreachMap[c.id])}` : 'Not yet contacted'}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.orderBadge}>
                            {stats.totalOrders} ({stats.activeOrders} active)
                          </span>
                        </td>
                        <td>
                          <span className={styles.currencyCell}>{formatCurrency(stats.totalSpend)}</span>
                        </td>
                        <td>
                          <span className={`${styles.currencyCell} ${stats.totalBalance > 0 ? styles.hasBalance : ''}`}>
                            {formatCurrency(stats.totalBalance)}
                          </span>
                        </td>
                        <td className={styles.alignRight}>
                          <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${c.whatsappNumber}`} className={styles.actionBtn} aria-label="Call">
                              <FaPhone />
                            </a>
                            <a href={`https://wa.me/${c.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtn} aria-label="WhatsApp">
                              <FaWhatsapp /> WhatsApp
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > visibleCount && (
              <button
                type="button"
                className={styles.loadMoreBtn}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </PageLayout>
  );
}
