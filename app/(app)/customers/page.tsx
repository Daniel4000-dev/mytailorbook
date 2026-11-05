'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Avatar from '@/components/ui/Avatar/Avatar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { scrollContentToTop } from '@/lib/scrollToTop';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import { formatPhone, formatShortMonthYear, formatDate, getWhatsAppLink, getInitials } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import type { Customer, Order } from '@/lib/types';
import { GARMENT_STYLES } from '@/lib/constants';
import { getStylePhotoSubmissionsAction, getApprovedStyleNamesAction, getOutreachLogAction, logOutreachContactAction } from '@/app/actions';
import type { StylePhotoSubmission } from '@/lib/types';
import { shareStylePhoto } from '@/lib/share-outreach';
import CustomersSkeleton from './_components/CustomersSkeleton';
import AddCustomerSheet from './_components/AddCustomerSheet';
import {
  getStoredMockCustomers,
  isMockCustomersActive,
  wipeMockCustomers,
  resetMockCustomers,
  MOCK_ORDERS,
} from '@/lib/mockCustomers';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

const PAGE_SIZE = 40;
type ClientFilter = 'all' | 'ready' | 'active' | 'owing' | 'male' | 'female';

interface CustomerStatDetail {
  totalOrders: number;
  activeOrders: number;
  totalSpend: number;
  totalBalance: number;
  activeOrder?: Order;
  latestOrder?: Order;
}

export default function CustomersPage() {
  const router = useRouter();
  const { user, isOwner, loading: authLoading } = useAuth();
  const { currentShop, customers: liveCustomers, orders: liveOrders, isLoaded } = useData();
  const { showToast } = useToast();

  const [mockCustomers, setMockCustomers] = useState<Customer[]>(() => {
    if (typeof window === 'undefined') return [];
    return isMockCustomersActive() ? getStoredMockCustomers() : [];
  });
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    if (liveCustomers.length > 0) {
      setIsUsingMock(false);
    } else {
      const active = isMockCustomersActive();
      const stored = getStoredMockCustomers();
      setMockCustomers(stored);
      setIsUsingMock(active && stored.length > 0);
    }
  }, [liveCustomers]);

  const customers = isUsingMock ? mockCustomers : liveCustomers;
  const orders = isUsingMock ? (liveOrders.length > 0 ? liveOrders : MOCK_ORDERS) : liveOrders;

  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [approvedStyleNames, setApprovedStyleNames] = useState<Set<string>>(new Set());

  // Outreach states
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
  const [selectionMode, setSelectionMode] = useState<'everyone' | 'choose'>('everyone');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentShop?.id) return;
    getApprovedStyleNamesAction(currentShop.id).then((names) => {
      if (!names || 'error' in names) return;
      setApprovedStyleNames(new Set(names));
    });
  }, [currentShop?.id]);

  useEffect(() => {
    if (isOutreachSheetOpen) scrollContentToTop();
  }, [isOutreachSheetOpen, outreachStep, queueIndex]);

  const [prevStyleFilter, setPrevStyleFilter] = useState(styleFilter);
  if (styleFilter !== prevStyleFilter) {
    setPrevStyleFilter(styleFilter);
    setSavedPhotos([]);
    setOutreachMap({});
  }

  useEffect(() => {
    if (!styleFilter || !currentShop?.id) return;
    getStylePhotoSubmissionsAction(currentShop.id, styleFilter).then((result) => {
      if (!result || 'error' in result) return;
      setSavedPhotos(result.saved);
    });
    getOutreachLogAction(currentShop.id, styleFilter).then((entries) => {
      if (!entries || 'error' in entries) return;
      const map: Record<string, string> = {};
      entries.forEach((e) => {
        if (!map[e.customerId]) map[e.customerId] = e.contactedAt;
      });
      setOutreachMap(map);
    });
  }, [styleFilter, currentShop]);

  // Derive order stats and identify active & latest garment per customer
  const customerStats = useMemo(() => {
    const stats: Record<string, CustomerStatDetail> = {};
    
    customers.forEach(c => {
      stats[c.id] = { totalOrders: 0, activeOrders: 0, totalSpend: 0, totalBalance: 0 };
    });

    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sortedOrders.forEach(o => {
      if (o.customerId && stats[o.customerId]) {
        const s = stats[o.customerId];
        s.totalOrders += 1;
        if (o.status !== 'Delivered') {
          s.activeOrders += 1;
          if (!s.activeOrder) {
            s.activeOrder = o;
          }
        }
        if (!s.latestOrder) {
          s.latestOrder = o;
        }
        s.totalSpend += o.totalBill;
        s.totalBalance += getBalanceOwed(o);
      }
    });
    return stats;
  }, [customers, orders]);

  // Pre-fetch customer profile routes
  useEffect(() => {
    if (!isLoaded) return;
    customers.slice(0, 60).forEach((c) => router.prefetch(ROUTES.customerDetail(c)));
  }, [isLoaded, customers, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setVisibleCount(PAGE_SIZE), [search, clientFilter, styleFilter]);

  const availableStyles = useMemo(() => {
    const scoped = (clientFilter === 'male' || clientFilter === 'female')
      ? customers.filter((c) => c.gender === clientFilter)
      : customers;
    const names = new Set<string>();
    scoped.forEach((c) => c.preferredStyles?.forEach((s) => names.add(s)));
    return Array.from(names)
      .filter((name) => approvedStyleNames.has(name))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, photoUrl: GARMENT_STYLES.find((g) => g.name === name)?.photoUrl }));
  }, [customers, clientFilter, approvedStyleNames]);

  // Filtered customer list
  const filtered = useMemo(() => {
    const rawSearch = search.toLowerCase().trim();
    const searchDigits = rawSearch.replace(/\D/g, '');

    return customers.filter((c) => {
      const stats = customerStats[c.id];
      if (clientFilter === 'male' && c.gender !== 'male') return false;
      if (clientFilter === 'female' && c.gender !== 'female') return false;
      if (clientFilter === 'ready' && stats?.activeOrder?.status !== 'Ready') return false;
      if (clientFilter === 'active' && (!stats || stats.activeOrders <= 0)) return false;
      if (clientFilter === 'owing' && (!stats || stats.totalBalance <= 0)) return false;
      if (styleFilter && !c.preferredStyles?.includes(styleFilter)) return false;
      if (!rawSearch) return true;

      const nameMatches = c.fullName.toLowerCase().includes(rawSearch);
      const phoneMatches = c.whatsappNumber.includes(rawSearch);
      const phoneDigitsMatches =
        searchDigits.length >= 3 &&
        (c.whatsappNumber.replace(/\D/g, '').includes(searchDigits) ||
          (searchDigits.startsWith('0') && c.whatsappNumber.replace(/\D/g, '').includes(searchDigits.slice(1))));

      return nameMatches || phoneMatches || phoneDigitsMatches;
    });
  }, [customers, clientFilter, styleFilter, search, customerStats]);

  const { totalCustomers, activeCustomers, owingCount, readyCount, totalBalanceOwed } = useMemo(() => {
    let active = 0;
    let owing = 0;
    let ready = 0;
    let totalBal = 0;
    customers.forEach((c) => {
      const s = customerStats[c.id];
      if (s) {
        if (s.activeOrder?.status === 'Ready') ready += 1;
        if (s.activeOrders > 0) active += 1;
        if (s.totalBalance > 0) {
          owing += 1;
          totalBal += s.totalBalance;
        }
      }
    });
    return {
      totalCustomers: customers.length,
      activeCustomers: active,
      owingCount: owing,
      readyCount: ready,
      totalBalanceOwed: totalBal,
    };
  }, [customers, customerStats]);

  const openOutreachSheet = () => {
    setOutreachStep('compose');
    setSelectedPhoto(savedPhotos[0] || null);
    setNoteText(currentShop?.outreachTemplate || `Hi {name}, thought you'd love this ${styleFilter} style!`);
    setIncludeContacted(false);
    setSelectionMode('everyone');
    setSelectedCustomerIds(new Set());
    setIsOutreachSheetOpen(true);
  };

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const topBar = (
    <TopBar
      title="Customers"
      rightAction={
        <div className={styles.headerActions}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddSheetOpen(true)}
            className={styles.addCustomerBtn}
          >
            <Symbol name="person_add" size={16} /> New Client
          </Button>
          <NotificationBell />
        </div>
      }
    />
  );

  if (authLoading || !isLoaded) {
    return (
      <PageLayout header={topBar}>
        <CustomersSkeleton />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout header={topBar}>
        <EmptyState
          icon={<Symbol name="person_off" />}
          title="Access Denied"
          description="Only owners can view the customer directory."
        />
      </PageLayout>
    );
  }

  const shopInitials = getInitials(currentShop?.name || 'MyTailorBook');

  return (
    <PageLayout header={topBar}>
      {/* ── Sample Clients Preview Banner ──────────────────────────── */}
      {isUsingMock && (
        <div className={styles.mockBanner}>
          <div className={styles.mockBannerText}>
            <Symbol name="visibility" size={15} />
            <span>Showing <strong>{customers.length} sample clients</strong> so you can preview the elevated UI.</span>
          </div>
          <button
            type="button"
            className={styles.mockBannerBtn}
            onClick={() => {
              wipeMockCustomers();
              setMockCustomers([]);
              setIsUsingMock(false);
              showToast('Switched to blank state', 'info');
            }}
          >
            Show Blank State
          </button>
        </div>
      )}

      {/* ── 1. Executive Workshop Client Pulse (KPI Cards) ─────────── */}
      <div className={styles.kpiGrid}>
        <div
          className={`${styles.kpiCard} ${clientFilter === 'all' ? styles.kpiCardActive : ''}`}
          onClick={() => setClientFilter('all')}
          title="View all clients"
        >
          <div className={styles.kpiIconWrap}>
            <Symbol name="group" size={16} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiVal}>{totalCustomers}</span>
            <span className={styles.kpiLabel}>Total Clients</span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${clientFilter === 'ready' ? styles.kpiCardActive : ''} ${readyCount > 0 ? styles.kpiCardReady : ''}`}
          onClick={() => setClientFilter(clientFilter === 'ready' ? 'all' : 'ready')}
          title="View clients ready for pickup"
        >
          <div className={`${styles.kpiIconWrap} ${readyCount > 0 ? styles.kpiIconReady : ''}`}>
            <Symbol name="checkroom" size={16} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiVal}>{readyCount}</span>
            <span className={styles.kpiLabel}>Ready for Pickup</span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${clientFilter === 'active' ? styles.kpiCardActive : ''}`}
          onClick={() => setClientFilter(clientFilter === 'active' ? 'all' : 'active')}
          title="View clients with outfits in production"
        >
          <div className={styles.kpiIconWrap}>
            <Symbol name="content_cut" size={16} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiVal}>{activeCustomers}</span>
            <span className={styles.kpiLabel}>In Production</span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${clientFilter === 'owing' ? styles.kpiCardActive : ''} ${owingCount > 0 ? styles.kpiCardOwing : ''}`}
          onClick={() => setClientFilter(clientFilter === 'owing' ? 'all' : 'owing')}
          title="View clients with outstanding balances"
        >
          <div className={`${styles.kpiIconWrap} ${owingCount > 0 ? styles.kpiIconOwing : ''}`}>
            <Symbol name="payments" size={16} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiVal}>
              {totalBalanceOwed > 0 ? `₦${Math.round(totalBalanceOwed / 1000)}k` : `${owingCount}`}
            </span>
            <span className={styles.kpiLabel}>
              {owingCount > 0 ? `${owingCount} Owing` : 'Zero Debt'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Search Bar with Integrated Gender & Style Controls ── */}
      <div className={styles.searchBarRow}>
        <div className={styles.searchBarPill}>
          <Symbol name="search" size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, styles, phone..."
          />
          {search && (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <Symbol name="close" size={12} />
            </button>
          )}
        </div>

        {/* Gender Segmented Switch [All | Men | Women] */}
        <div className={styles.genderSegment} role="group" aria-label="Filter by gender">
          <button
            type="button"
            className={`${styles.genderSegmentBtn} ${clientFilter !== 'male' && clientFilter !== 'female' ? styles.genderSegmentBtnActive : ''}`}
            onClick={() => {
              if (clientFilter === 'male' || clientFilter === 'female') setClientFilter('all');
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.genderSegmentBtn} ${clientFilter === 'male' ? styles.genderSegmentBtnActive : ''}`}
            onClick={() => {
              setClientFilter(clientFilter === 'male' ? 'all' : 'male');
              if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'male')) {
                setStyleFilter(null);
              }
            }}
          >
            Men
          </button>
          <button
            type="button"
            className={`${styles.genderSegmentBtn} ${clientFilter === 'female' ? styles.genderSegmentBtnActive : ''}`}
            onClick={() => {
              setClientFilter(clientFilter === 'female' ? 'all' : 'female');
              if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'female')) {
                setStyleFilter(null);
              }
            }}
          >
            Women
          </button>
        </div>

        <button
          type="button"
          className={`${styles.filterActionBtn} ${styleFilter ? styles.filterActionBtnActive : ''}`}
          onClick={() => {
            if (styleFilter) setStyleFilter(null);
            else setIsStyleSheetOpen(true);
          }}
          title={styleFilter ? `Clear ${styleFilter} filter` : 'Filter styles'}
        >
          <Symbol name={styleFilter ? 'close' : 'tune'} size={14} />
          <span>{styleFilter || 'Style'}</span>
        </button>
      </div>

      {/* Active style filter chip */}
      {styleFilter && (
        <div className={styles.activeFilterChipRow}>
          <span className={styles.activeFilterChip}>
            Style: <strong>{styleFilter}</strong>
            <button
              type="button"
              onClick={() => setStyleFilter(null)}
              className={styles.activeFilterChipClose}
              aria-label={`Remove ${styleFilter} filter`}
            >
              <Symbol name="close" size={12} />
            </button>
          </span>
        </div>
      )}

      {/* Style Filter BottomSheet */}
      <BottomSheet isOpen={isStyleSheetOpen} onClose={() => setIsStyleSheetOpen(false)} title="Filter by Style">
        {availableStyles.length === 0 ? (
          <p className={styles.noStylesHint}>
            No styles to filter by yet — a style shows up here once it has both an approved Style Gallery photo
            and at least one customer who prefers it.
          </p>
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
                    <Image src={s.photoUrl} alt="" width={200} height={200} />
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

      {/* Outreach Action Bar */}
      {styleFilter && (
        savedPhotos.length > 0 ? (
          <button type="button" className={styles.reachOutBar} onClick={openOutreachSheet}>
            <Symbol name="ios_share" size={18} />
            <span>Message {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'} about {styleFilter}</span>
          </button>
        ) : (
          <a href={ROUTES.styleDetail(styleFilter)} className={styles.reachOutHint}>
            No approved photos yet for {styleFilter} — add one in Style Gallery
          </a>
        )
      )}

      {/* Outreach Sheet */}
      <BottomSheet
        isOpen={isOutreachSheetOpen}
        onClose={closeOutreachSheet}
        title={outreachStep === 'compose' ? `Message Customers — ${styleFilter}` : undefined}
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
                    <Image src={p.photoUrl} alt="" width={200} height={200} />
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

            <span className={styles.composeLabel}>Send to</span>
            <div className={styles.pillTrack}>
              <button
                type="button"
                className={`${styles.softPill} ${selectionMode === 'everyone' ? styles.softPillActive : ''}`}
                onClick={() => setSelectionMode('everyone')}
              >
                <span>Everyone</span>
              </button>
              <button
                type="button"
                className={`${styles.softPill} ${selectionMode === 'choose' ? styles.softPillActive : ''}`}
                onClick={() => setSelectionMode('choose')}
              >
                <span>Choose People</span>
              </button>
            </div>

            {(() => {
              const notYetContacted = filtered.filter((c) => !outreachMap[c.id]);
              const everyoneTarget = includeContacted ? filtered : notYetContacted;
              const chosenTarget = filtered.filter((c) => selectedCustomerIds.has(c.id));
              const queueTarget = selectionMode === 'everyone' ? everyoneTarget : chosenTarget;

              if (selectionMode === 'choose') {
                return (
                  <>
                    <div className={styles.customerPickList}>
                      {filtered.map((c) => (
                        <label key={c.id} className={styles.customerPickRow}>
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.has(c.id)}
                            onChange={() => toggleCustomerSelection(c.id)}
                          />
                          <span>{c.fullName}</span>
                          {outreachMap[c.id] && <span className={styles.pickContactedTag}>Already contacted</span>}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.startBtn}
                      disabled={!selectedPhoto || queueTarget.length === 0}
                      onClick={() => startQueue(queueTarget)}
                    >
                      {queueTarget.length === 0
                        ? 'Select at least one customer'
                        : `Start (${queueTarget.length} ${queueTarget.length === 1 ? 'customer' : 'customers'})`}
                    </button>
                  </>
                );
              }

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
                <p>All done — messaged everyone on this list.</p>
                <button type="button" className={styles.startBtn} onClick={closeOutreachSheet}>Close</button>
              </div>
            ) : (
              <>
                <p className={styles.queuePosition}>Customer {queueIndex + 1} of {queueList.length}</p>
                <div className={styles.queueCard}>
                  <Avatar name={queueList[queueIndex].fullName} size="md" shape="circle" />
                  <div>
                    <p className={styles.queueName}>{queueList[queueIndex].fullName}</p>
                    <p className={styles.queuePhone}>{formatPhone(queueList[queueIndex].whatsappNumber)}</p>
                    {outreachMap[queueList[queueIndex].id] && (
                      <span className={styles.contactedTag}>
                        Already messaged {formatDate(outreachMap[queueList[queueIndex].id])}
                      </span>
                    )}
                  </div>
                </div>
                {selectedPhoto && (
                  <div className={styles.queuePreviewPhoto}>
                    <Image src={selectedPhoto.photoUrl} alt="" width={200} height={200} />
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
                    <>
                      {sharing && <Symbol name="progress_activity" className="global-spinner" />}
                      <Symbol name="ios_share" size={18} /> Share
                    </>
                  </button>
                </div>
                <button type="button" className={styles.markSentLink} onClick={handleMarkSentManually}>
                  Already sent — mark as sent
                </button>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ── 4. Customer Feed (Continuous, Borderless List) ───────────── */}
      {filtered.length === 0 ? (
        customers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <EmptyState
              image={{ src: '/images/empty-states/customers.png', width: 608, height: 797 }}
              title="No customers yet"
              description="Your customer book starts with your first order — create one or load sample workshop clients to preview the directory."
              action={{ label: 'Create Order', href: ROUTES.orderNew }}
            />
            <button
              type="button"
              className={styles.softPill}
              style={{ marginTop: '-8px', marginBottom: '24px' }}
              onClick={() => {
                const fresh = resetMockCustomers();
                setMockCustomers(fresh);
                setIsUsingMock(true);
                showToast('Sample clients loaded', 'success');
              }}
            >
              <Symbol name="visibility" size={14} />
              <span>Load Sample Clients</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <EmptyState
              icon={<Symbol name="person_off" />}
              title="No customers found"
              description={
                search.trim()
                  ? `No client matching "${search.trim()}". You can clear your search or save them as a new client right away.`
                  : 'Try adjusting your filters or search term'
              }
              action={
                search.trim()
                  ? { label: `Add "${search.trim()}"`, onClick: () => setIsAddSheetOpen(true) }
                  : { label: 'New Client', onClick: () => setIsAddSheetOpen(true) }
              }
            />
            {search.trim() && (
              <button
                type="button"
                className={styles.softPill}
                style={{ marginTop: '-8px', marginBottom: '24px' }}
                onClick={() => setSearch('')}
              >
                <Symbol name="close" size={13} />
                <span>Clear search</span>
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <div className={styles.customerFeed}>
            {filtered.slice(0, visibleCount).map((c) => {
              const stats = customerStats[c.id];
              const hasActive = stats && stats.activeOrders > 0;
              const isReady = stats?.activeOrder?.status === 'Ready';
              const hasBalance = stats && stats.totalBalance > 0;

              // Conversational subtitle
              let subtitle = '';
              if (stats?.activeOrder) {
                const garment = stats.activeOrder.styleName || 'Custom Garment';
                const stage = stats.activeOrder.status === 'Ready' ? 'Ready for pickup' : `In ${stats.activeOrder.status}`;
                subtitle = `${garment} · ${stage}`;
                if (hasBalance) {
                  subtitle += ` · ₦${Math.round(stats.totalBalance).toLocaleString()} due`;
                }
              } else if (hasBalance) {
                subtitle = `₦${Math.round(stats.totalBalance).toLocaleString()} balance due · ${formatPhone(c.whatsappNumber)}`;
              } else if (stats?.latestOrder) {
                const garment = stats.latestOrder.styleName || 'Custom Order';
                subtitle = `Last: ${garment} · ${formatShortMonthYear(stats.latestOrder.createdAt)}`;
              } else {
                subtitle = `Client · ${formatPhone(c.whatsappNumber)}`;
              }

              // Contextual WhatsApp greeting to remove typing friction for tailors
              const whatsappGreeting = isReady
                ? `Hello ${c.fullName}, your ${stats?.activeOrder?.styleName || 'outfit'} is ready for pickup at our workshop! Looking forward to seeing you.`
                : hasBalance
                ? `Hello ${c.fullName}, friendly reminder regarding your pending balance of ₦${Math.round(stats.totalBalance).toLocaleString()} at our shop. Thank you!`
                : `Hello ${c.fullName}!`;

              return (
                <div
                  key={c.id}
                  className={styles.customerRow}
                  onClick={() => router.push(ROUTES.customerDetail(c))}
                >
                  <div className={styles.avatarWrap}>
                    <Avatar name={c.fullName} size="lg" shape="circle" className={styles.circleAvatar} />
                    {isReady ? (
                      <span className={styles.onlineBadge} title="Ready for pickup" />
                    ) : hasActive ? (
                      <span className={styles.activeBadge} title="In production" />
                    ) : null}
                  </div>

                  <div className={styles.customerInfo}>
                    <div className={styles.customerHeaderLine}>
                      <span className={styles.customerName}>{c.fullName}</span>
                      {c.gender && (
                        <span className={styles.genderSubtle}>{c.gender === 'female' ? 'F' : 'M'}</span>
                      )}
                    </div>
                    <div className={styles.customerSubtitle}>
                      <span className={styles.subtitleText}>{subtitle}</span>
                    </div>
                  </div>

                  <div className={styles.rightActionCol}>
                    {hasBalance && (
                      <span className={styles.owesPill}>
                        ₦{Math.round(stats.totalBalance).toLocaleString()}
                      </span>
                    )}
                    {isReady && !hasBalance && (
                      <span className={styles.readyPill}>Ready</span>
                    )}
                    <div className={styles.quickActionIcons} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:+${c.whatsappNumber}`}
                        className={styles.callActionBtn}
                        aria-label={`Call ${c.fullName}`}
                        title={`Call ${c.fullName}`}
                      >
                        <Symbol name="call" size={15} />
                      </a>
                      <a
                        href={getWhatsAppLink(c.whatsappNumber, whatsappGreeting)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.whatsappActionBtn}
                        aria-label={`WhatsApp ${c.fullName}`}
                        title={`WhatsApp ${c.fullName}`}
                      >
                        <WhatsappIcon size={16} />
                      </a>
                    </div>
                    <Symbol name="chevron_right" size={18} className={styles.rowChevron} />
                  </div>
                </div>
              );
            })}
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

      <AddCustomerSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        initialName={search.trim()}
        onCustomerCreated={(newCust) => {
          setIsAddSheetOpen(false);
          setSearch('');
          router.push(ROUTES.customerDetail(newCust));
        }}
      />
    </PageLayout>
  );
}
