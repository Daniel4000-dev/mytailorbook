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
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

const PAGE_SIZE = 40;
type ClientFilter = 'all' | 'active' | 'owing' | 'male' | 'female';

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
  const { currentShop, customers, orders, isLoaded } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);
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
    customers.slice(0, 60).forEach((c) => router.prefetch(ROUTES.customerDetail(c.id)));
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

  const { totalCustomers, activeCustomers, owingCount } = useMemo(() => {
    let active = 0;
    let owing = 0;
    customers.forEach((c) => {
      const s = customerStats[c.id];
      if (s) {
        if (s.activeOrders > 0) active += 1;
        if (s.totalBalance > 0) owing += 1;
      }
    });
    return {
      totalCustomers: customers.length,
      activeCustomers: active,
      owingCount: owing,
    };
  }, [customers, customerStats]);

  // Active / VIP clients for Instagram-style Story Notes Row
  const storyClients = useMemo(() => {
    const activeOrOwing = customers.filter(c => {
      const s = customerStats[c.id];
      return s && (s.activeOrders > 0 || s.totalBalance > 0);
    });

    const list = [...activeOrOwing];
    if (list.length < 8) {
      customers.forEach(c => {
        if (!list.some(p => p.id === c.id) && list.length < 8) {
          list.push(c);
        }
      });
    }

    return list.slice(0, 10).map(c => {
      const s = customerStats[c.id];
      let noteText = 'Client';
      let noteIcon = 'person';
      let isReady = false;
      let hasActive = false;

      if (s?.activeOrder) {
        hasActive = true;
        if (s.activeOrder.status === 'Ready') {
          noteText = 'Ready';
          noteIcon = 'checkroom';
          isReady = true;
        } else if (s.activeOrder.status === 'Sewing') {
          noteText = 'In Sewing';
          noteIcon = 'needle';
        } else if (s.activeOrder.status === 'Cutting') {
          noteText = 'In Cutting';
          noteIcon = 'content_cut';
        } else {
          noteText = s.activeOrder.styleName ? s.activeOrder.styleName.split(' ')[0] : 'In Progress';
          noteIcon = 'inventory_2';
        }
      } else if (s && s.totalBalance > 0) {
        noteText = `₦${Math.round(s.totalBalance / 1000)}k due`;
        noteIcon = 'payments';
      } else {
        noteText = c.preferredStyles?.[0] || 'Atelier';
        noteIcon = 'star';
      }

      const firstName = c.fullName.split(' ')[0] || c.fullName;

      return {
        customer: c,
        noteText,
        noteIcon,
        isReady,
        hasActive,
        firstName,
      };
    });
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
            onClick={() => router.push(ROUTES.customerNew)}
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
      {/* ── 1. Search Bar with Integrated Filter (Instagram Pill Style) ── */}
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
        <button
          type="button"
          className={`${styles.filterActionBtn} ${styleFilter ? styles.filterActionBtnActive : ''}`}
          onClick={() => setIsStyleSheetOpen(true)}
          title="Filter styles"
        >
          <Symbol name="tune" size={14} />
          <span>{styleFilter || 'Filter'}</span>
        </button>
      </div>

      {/* ── 2. Top Story Notes Carousel (Instagram Highlights / Notes) ── */}
      {storyClients.length > 0 && (
        <section className={styles.storiesSection} aria-label="Active fits & clients">
          <div className={styles.storiesTrack}>
            {/* Atelier Story Bubble */}
            <div
              className={styles.storyItem}
              onClick={() => router.push(ROUTES.customerNew)}
              title="Add new client"
            >
              <div className={styles.storyBubble}>
                <Symbol name="auto_awesome" size={10} />
                <span>Atelier</span>
                <span className={styles.storyBubbleTail} />
              </div>
              <div className={styles.storyAvatarWrap}>
                <div className={`${styles.storyRing} ${styles.storyRingGradient}`}>
                  <div className={styles.storyAvatarInner}>
                    <Avatar name={shopInitials} size="lg" shape="circle" />
                  </div>
                </div>
              </div>
              <span className={styles.storyName}>Your note</span>
            </div>

            {/* Client Story Bubbles */}
            {storyClients.map((item) => (
              <div
                key={item.customer.id}
                className={styles.storyItem}
                onClick={() => router.push(ROUTES.customerDetail(item.customer.id))}
                title={`View ${item.customer.fullName}`}
              >
                <div className={styles.storyBubble}>
                  <Symbol name={item.noteIcon} size={10} />
                  <span>{item.noteText}</span>
                  <span className={styles.storyBubbleTail} />
                </div>
                <div className={styles.storyAvatarWrap}>
                  <div
                    className={`${styles.storyRing} ${
                      item.isReady
                        ? styles.storyRingReady
                        : item.hasActive
                        ? styles.storyRingGradient
                        : styles.storyRingNeutral
                    }`}
                  >
                    <div
                      className={`${styles.storyAvatarInner} ${
                        !item.hasActive && !item.isReady ? styles.storyAvatarInnerPlain : ''
                      }`}
                    >
                      <Avatar name={item.customer.fullName} size="lg" shape="circle" />
                    </div>
                  </div>
                </div>
                <span className={styles.storyName}>{item.firstName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Soft Filter Pills (Borderless Capsules) ──────────────── */}
      <div className={styles.pillTrack}>
        <button
          type="button"
          className={`${styles.softPill} ${clientFilter === 'all' ? styles.softPillActive : ''}`}
          onClick={() => setClientFilter('all')}
        >
          {clientFilter === 'all' && <span className={styles.pillDot} />}
          <span>All {totalCustomers > 0 ? totalCustomers : ''}</span>
        </button>

        <button
          type="button"
          className={`${styles.softPill} ${clientFilter === 'active' ? styles.softPillActive : ''}`}
          onClick={() => setClientFilter(clientFilter === 'active' ? 'all' : 'active')}
        >
          {clientFilter === 'active' && <span className={styles.pillDot} />}
          <span>In Production {activeCustomers > 0 ? activeCustomers : ''}</span>
        </button>

        <button
          type="button"
          className={`${styles.softPill} ${clientFilter === 'owing' ? styles.softPillActive : ''}`}
          onClick={() => setClientFilter(clientFilter === 'owing' ? 'all' : 'owing')}
        >
          {clientFilter === 'owing' && <span className={styles.pillDotAmber} />}
          <span>Owing {owingCount > 0 ? owingCount : ''}</span>
        </button>

        <button
          type="button"
          className={`${styles.softPill} ${clientFilter === 'male' ? styles.softPillActive : ''}`}
          onClick={() => {
            setClientFilter(clientFilter === 'male' ? 'all' : 'male');
            if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'male')) {
              setStyleFilter(null);
            }
          }}
        >
          <span>Men</span>
        </button>

        <button
          type="button"
          className={`${styles.softPill} ${clientFilter === 'female' ? styles.softPillActive : ''}`}
          onClick={() => {
            setClientFilter(clientFilter === 'female' ? 'all' : 'female');
            if (styleFilter && !GARMENT_STYLES.some((g) => g.name === styleFilter && g.gender === 'female')) {
              setStyleFilter(null);
            }
          }}
        >
          <span>Women</span>
        </button>

        {styleFilter && (
          <button
            type="button"
            className={`${styles.softPill} ${styles.softPillActive}`}
            onClick={() => setStyleFilter(null)}
            title="Clear style filter"
          >
            <span>{styleFilter}</span>
            <Symbol name="close" size={11} />
          </button>
        )}
      </div>

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
            <span>Reach out to {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'} about {styleFilter}</span>
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

            <span className={styles.composeLabel}>Who should get this?</span>
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
                <p>All done — reached out to everyone in this list.</p>
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
                        Already reached out {formatDate(outreachMap[queueList[queueIndex].id])}
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
                  Already sent this manually — just mark as contacted
                </button>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ── 4. Customer Feed (Continuous, Borderless List) ───────────── */}
      {filtered.length === 0 ? (
        customers.length === 0 ? (
          <EmptyState
            image={{ src: '/images/empty-states/customers.png', width: 608, height: 797 }}
            title="No customers yet"
            description="Your customer book starts with your first order — create one and the customer is saved here automatically."
            action={{ label: 'Create Order', href: ROUTES.orderNew }}
          />
        ) : (
          <EmptyState
            icon={<Symbol name="person_off" />}
            title="No customers found"
            description="Try a different search or filter"
            action={{ label: 'Add Customer', href: ROUTES.customerNew }}
          />
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
                const garment = stats.latestOrder.styleName || 'Bespoke Order';
                subtitle = `Last: ${garment} · ${formatShortMonthYear(stats.latestOrder.createdAt)}`;
              } else {
                subtitle = `Client · ${formatPhone(c.whatsappNumber)}`;
              }

              return (
                <div
                  key={c.id}
                  className={styles.customerRow}
                  onClick={() => router.push(ROUTES.customerDetail(c.id))}
                >
                  <div className={styles.avatarWrap}>
                    <div
                      className={`${styles.avatarRing} ${
                        isReady
                          ? styles.ringReady
                          : hasActive
                          ? styles.ringGradient
                          : ''
                      }`}
                    >
                      <div className={`${styles.avatarInner} ${!hasActive && !isReady ? styles.avatarInnerPlain : ''}`}>
                        <Avatar name={c.fullName} size="lg" shape="circle" className={styles.circleAvatar} />
                      </div>
                    </div>
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
                    {hasActive && !hasBalance && (
                      <span className={styles.activeDot} />
                    )}
                    <div className={styles.quickActionIcons} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={getWhatsAppLink(c.whatsappNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.whatsappActionBtn}
                        aria-label={`WhatsApp ${c.fullName}`}
                      >
                        <WhatsappIcon size={18} />
                      </a>
                    </div>
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
    </PageLayout>
  );
}
