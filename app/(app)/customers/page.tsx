'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { formatCurrency, formatPhone, formatShortMonthYear, formatDate, getWhatsAppLink, getTelLink, getInitials } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import type { Customer, Order, StyleCatalogue } from '@/lib/types';
import { GARMENT_STYLES, resolveCanonicalStyleName, isMockDataAllowed } from '@/lib/constants';
import { getStylePhotoSubmissionsAction, getApprovedStyleNamesAction, getOutreachLogAction, logOutreachContactAction } from '@/app/actions';
import { getCataloguesAction } from '@/app/actions/catalogues';
import { getStoredMockCatalogues } from '@/lib/mockCatalogues';
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

export interface LookbookOutreachPhoto {
  id: string;
  photoUrl: string;
  label?: string;
  albumTitle?: string;
}

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

  // Lookbooks & Outreach states
  const [catalogues, setCatalogues] = useState<StyleCatalogue[]>([]);
  const [matchingAlbum, setMatchingAlbum] = useState<StyleCatalogue | null>(null);
  const [outreachPhotos, setOutreachPhotos] = useState<LookbookOutreachPhoto[]>([]);
  const [outreachMap, setOutreachMap] = useState<Record<string, string>>({});
  const [isOutreachSheetOpen, setIsOutreachSheetOpen] = useState(false);
  const [outreachStep, setOutreachStep] = useState<'compose' | 'queue'>('compose');
  const [selectedPhoto, setSelectedPhoto] = useState<LookbookOutreachPhoto | null>(null);
  const [noteText, setNoteText] = useState('');
  const [queueList, setQueueList] = useState<Customer[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [includeContacted, setIncludeContacted] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'everyone' | 'choose'>('everyone');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // Support direct deep-link ?style=Senator into Style Leads
  const searchParams = useSearchParams();
  useEffect(() => {
    const qStyle = searchParams.get('style');
    if (qStyle) {
      setStyleFilter(decodeURIComponent(qStyle));
    }
  }, [searchParams]);

  // Load shop lookbook catalogues
  useEffect(() => {
    if (!currentShop?.id) return;
    getCataloguesAction(currentShop.id)
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCatalogues(cats);
        } else if (isMockDataAllowed(user?.email)) {
          setCatalogues(getStoredMockCatalogues());
        } else {
          setCatalogues([]);
        }
      })
      .catch(() => {
        if (isMockDataAllowed(user?.email)) {
          setCatalogues(getStoredMockCatalogues());
        }
      });
  }, [currentShop?.id, user?.email]);

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
    setOutreachPhotos([]);
    setSelectedPhoto(null);
    setOutreachMap({});
  }

  // Derive matching public lookbook album URL
  const matchingAlbumUrl = useMemo(() => {
    if (!matchingAlbum || !currentShop) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const slug = currentShop.slug || 'studio';
    return `${origin}/catalogue/${slug}?album=${matchingAlbum.id}`;
  }, [matchingAlbum, currentShop]);

  useEffect(() => {
    if (!styleFilter) {
      setMatchingAlbum(null);
      setOutreachPhotos([]);
      setSelectedPhoto(null);
      return;
    }

    const norm = styleFilter.toLowerCase().trim();
    const album = catalogues.find((c) => {
      const t = c.title.toLowerCase().trim();
      return t === norm || t.includes(norm) || norm.includes(t);
    }) || null;

    setMatchingAlbum(album);

    const photos: LookbookOutreachPhoto[] = [];
    if (album?.photos?.length) {
      album.photos.forEach((p, idx) => {
        photos.push({
          id: p.id,
          photoUrl: p.imageUrl,
          label: `Look ${idx + 1}`,
          albumTitle: album.title,
        });
      });
    }

    // Also include any legacy submissions if present
    if (currentShop?.id) {
      getStylePhotoSubmissionsAction(currentShop.id, styleFilter).then((res) => {
        if (res && 'saved' in res && res.saved?.length) {
          res.saved.forEach((s) => {
            if (!photos.some((p) => p.photoUrl === s.photoUrl)) {
              photos.push({
                id: s.id,
                photoUrl: s.photoUrl,
                label: `Look ${photos.length + 1}`,
                albumTitle: styleFilter,
              });
            }
          });
        }
        setOutreachPhotos(photos);
        setSelectedPhoto(photos[0] || null);
      }).catch(() => {
        setOutreachPhotos(photos);
        setSelectedPhoto(photos[0] || null);
      });

      getOutreachLogAction(currentShop.id, styleFilter).then((entries) => {
        if (!entries || 'error' in entries) return;
        const map: Record<string, string> = {};
        entries.forEach((e) => {
          if (!map[e.customerId]) map[e.customerId] = e.contactedAt;
        });
        setOutreachMap(map);
      });
    } else {
      setOutreachPhotos(photos);
      setSelectedPhoto(photos[0] || null);
    }
  }, [styleFilter, catalogues, currentShop?.id]);

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

  // Map every customer to all garment styles they prefer, have custom fit profiles for, or have ordered
  const customerStylesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    customers.forEach((c) => {
      const set = new Set<string>();
      c.preferredStyles?.forEach((s) => {
        if (s) set.add(s);
      });
      if (c.styleMeasurements) {
        Object.keys(c.styleMeasurements).forEach((s) => {
          if (s) set.add(s);
        });
      }
      map[c.id] = set;
    });
    orders.forEach((o) => {
      if (o.customerId && o.styleName && map[o.customerId]) {
        const canonical = resolveCanonicalStyleName(o.styleName);
        if (canonical) {
          map[o.customerId].add(canonical);
        }
      }
    });
    return map;
  }, [customers, orders]);

  const availableStyles = useMemo(() => {
    const scoped = (clientFilter === 'male' || clientFilter === 'female')
      ? customers.filter((c) => c.gender === clientFilter)
      : customers;
    const counts = new Map<string, number>();
    scoped.forEach((c) => {
      customerStylesMap[c.id]?.forEach((s) => {
        counts.set(s, (counts.get(s) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([name, count]) => ({
        name,
        count,
        hasApprovedPhoto: approvedStyleNames.has(name),
        photoUrl: GARMENT_STYLES.find((g) => g.name === name)?.photoUrl,
      }));
  }, [customers, clientFilter, customerStylesMap, approvedStyleNames]);

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
      if (styleFilter && !customerStylesMap[c.id]?.has(styleFilter)) return false;
      if (!rawSearch) return true;

      const nameMatches = c.fullName.toLowerCase().includes(rawSearch);
      const phoneMatches = c.whatsappNumber.includes(rawSearch);
      const styleMatches = Array.from(customerStylesMap[c.id] || []).some((s) =>
        s.toLowerCase().includes(rawSearch)
      );
      const phoneDigitsMatches =
        searchDigits.length >= 3 &&
        (c.whatsappNumber.replace(/\D/g, '').includes(searchDigits) ||
          (searchDigits.startsWith('0') && c.whatsappNumber.replace(/\D/g, '').includes(searchDigits.slice(1))));

      return nameMatches || phoneMatches || styleMatches || phoneDigitsMatches;
    });
  }, [customers, clientFilter, styleFilter, search, customerStats, customerStylesMap]);

  const { totalCustomers, activeCustomers, owingCount, readyCount, totalBalanceOwed, maleCount, femaleCount } = useMemo(() => {
    let active = 0;
    let owing = 0;
    let ready = 0;
    let totalBal = 0;
    let men = 0;
    let women = 0;
    customers.forEach((c) => {
      if (c.gender === 'male') men += 1;
      else if (c.gender === 'female') women += 1;
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
      maleCount: men,
      femaleCount: women,
    };
  }, [customers, customerStats]);

  const getDefaultOutreachNote = useCallback(
    (styleName: string | null, hasPhotoSelected = false) => {
      if (currentShop?.outreachTemplate) return currentShop.outreachTemplate;
      if (matchingAlbumUrl && !hasPhotoSelected) {
        return `Hi {name}, we just finished some fresh ${styleName || 'bespoke'} designs at our workshop that would fit your measurements really well. Browse our latest looks here: ${matchingAlbumUrl} — let me know which style you'd love to commission!`;
      }
      return `Hi {name}, we just finished some fresh ${styleName || 'bespoke'} designs at our workshop that would fit your measurements really well. Would you like me to send you pictures?`;
    },
    [currentShop?.outreachTemplate, matchingAlbumUrl]
  );

  const openOutreachSheet = (directToQueue = false) => {
    const defaultPhoto = outreachPhotos[0] || null;
    setSelectedPhoto(defaultPhoto);
    const defaultNote = getDefaultOutreachNote(styleFilter, Boolean(defaultPhoto));
    setNoteText(defaultNote);
    setIncludeContacted(false);
    setSelectionMode('everyone');
    setSelectedCustomerIds(new Set());

    if (directToQueue) {
      const notYetContacted = filtered.filter((c) => !outreachMap[c.id]);
      const targets = notYetContacted.length > 0 ? notYetContacted : filtered;
      setQueueList(targets);
      setQueueIndex(0);
      setOutreachStep('queue');
    } else {
      setOutreachStep('compose');
    }
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

  const markCustomerContacted = useCallback(
    async (customerId: string) => {
      const nowIso = new Date().toISOString();
      setOutreachMap((prev) => ({ ...prev, [customerId]: nowIso }));
      if (styleFilter && currentShop?.id && user) {
        await logOutreachContactAction(currentShop.id, customerId, styleFilter, user.uid);
      }
    },
    [styleFilter, currentShop?.id, user]
  );

  const handleSendWhatsAppInQueue = useCallback(async () => {
    const customer = queueList[queueIndex];
    if (!customer || !styleFilter) return;
    const personalNote = (noteText || getDefaultOutreachNote(styleFilter, Boolean(selectedPhoto))).replace(
      /\{name\}/g,
      customer.fullName.split(' ')[0]
    );
    window.open(getWhatsAppLink(customer.whatsappNumber, personalNote), '_blank');
    await markCustomerContacted(customer.id);
    showToast(`Opened WhatsApp for ${customer.fullName.split(' ')[0]}`, 'success');
    setQueueIndex((i) => i + 1);
  }, [queueList, queueIndex, styleFilter, noteText, selectedPhoto, getDefaultOutreachNote, markCustomerContacted, showToast]);

  const handleShareToCurrent = useCallback(async () => {
    const customer = queueList[queueIndex];
    if (!customer || !styleFilter) return;
    const personalNote = (noteText || getDefaultOutreachNote(styleFilter, Boolean(selectedPhoto))).replace(
      /\{name\}/g,
      customer.fullName.split(' ')[0]
    );

    if (!selectedPhoto) {
      await handleSendWhatsAppInQueue();
      return;
    }

    setSharing(true);
    try {
      const result = await shareStylePhoto(selectedPhoto.photoUrl, personalNote);
      if (result === 'shared') {
        await markCustomerContacted(customer.id);
        showToast(`Shared with ${customer.fullName}`, 'success');
        setQueueIndex((i) => i + 1);
      } else if (result === 'unsupported') {
        window.open(getWhatsAppLink(customer.whatsappNumber, personalNote), '_blank');
        await markCustomerContacted(customer.id);
        showToast('Opened WhatsApp with your note — attach the photo in chat.', 'info');
        setQueueIndex((i) => i + 1);
      }
    } catch {
      showToast('Could not open the share sheet', 'error');
    } finally {
      setSharing(false);
    }
  }, [queueList, queueIndex, selectedPhoto, styleFilter, noteText, getDefaultOutreachNote, handleSendWhatsAppInQueue, markCustomerContacted, showToast]);

  const handleMarkSentManually = useCallback(async () => {
    const customer = queueList[queueIndex];
    if (!customer || !styleFilter) return;
    await markCustomerContacted(customer.id);
    setQueueIndex((i) => i + 1);
  }, [queueList, queueIndex, styleFilter, markCustomerContacted]);

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

      {/* ── 1. Four-Metric Client Pulse Grid ── */}
      <div className={styles.kpiGrid} role="tablist" aria-label="Filter clients by status">
        <button
          type="button"
          role="tab"
          aria-selected={clientFilter === 'all'}
          className={`${styles.kpiCard} ${clientFilter === 'all' ? styles.kpiCardActive : ''}`}
          onClick={() => setClientFilter('all')}
        >
          <div className={styles.kpiTopRow}>
            <div className={`${styles.kpiIconWrap} ${styles.kpiIconAll}`}>
              <Symbol name="group" size={16} />
            </div>
            <span className={styles.kpiVal}>{totalCustomers}</span>
          </div>
          <span className={styles.kpiLabel}>Total Clients</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={clientFilter === 'active'}
          className={`${styles.kpiCard} ${clientFilter === 'active' ? styles.kpiCardActive : ''}`}
          onClick={() => setClientFilter(clientFilter === 'active' ? 'all' : 'active')}
        >
          <div className={styles.kpiTopRow}>
            <div className={`${styles.kpiIconWrap} ${styles.kpiIconProduction}`}>
              <Symbol name="content_cut" size={16} />
            </div>
            <span className={styles.kpiVal}>{activeCustomers}</span>
          </div>
          <span className={styles.kpiLabel}>In Production</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={clientFilter === 'ready'}
          className={`${styles.kpiCard} ${clientFilter === 'ready' ? styles.kpiCardActive : ''}`}
          onClick={() => setClientFilter(clientFilter === 'ready' ? 'all' : 'ready')}
        >
          <div className={styles.kpiTopRow}>
            <div className={`${styles.kpiIconWrap} ${styles.kpiIconReady}`}>
              <Symbol name="checkroom" size={16} />
            </div>
            <span className={`${styles.kpiVal} ${readyCount > 0 ? styles.kpiValReady : ''}`}>
              {readyCount}
            </span>
          </div>
          <span className={styles.kpiLabel}>Ready for Pickup</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={clientFilter === 'owing'}
          className={`${styles.kpiCard} ${clientFilter === 'owing' ? styles.kpiCardActive : ''}`}
          onClick={() => setClientFilter(clientFilter === 'owing' ? 'all' : 'owing')}
        >
          <div className={styles.kpiTopRow}>
            <div className={`${styles.kpiIconWrap} ${styles.kpiIconOwing}`}>
              <Symbol name="payments" size={16} />
            </div>
            <span className={`${styles.kpiVal} ${owingCount > 0 ? styles.kpiValOwing : ''}`}>
              {owingCount}
            </span>
          </div>
          <span className={styles.kpiLabel}>
            {totalBalanceOwed > 0
              ? `Owing · ₦${Math.round(totalBalanceOwed / 1000)}k`
              : 'Owing Balance'}
          </span>
        </button>
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
          onClick={() => setIsStyleSheetOpen(true)}
          title="Browse styles & outbound leads"
        >
          <Symbol name="campaign" size={15} />
          <span>{styleFilter ? `Lead: ${styleFilter}` : 'Style Leads'}</span>
        </button>
      </div>

      {/* ── 2b. Zero-Friction 1-Tap Style & Outbound Leads Pill Rail ── */}
      {availableStyles.length > 0 && (
        <div className={styles.styleLeadRail} role="region" aria-label="Filter clients by garment style">
          <button
            type="button"
            className={`${styles.styleLeadPill} ${!styleFilter ? styles.styleLeadPillActive : ''}`}
            onClick={() => setStyleFilter(null)}
          >
            <span>All Styles</span>
          </button>
          {availableStyles.map((s) => {
            const active = styleFilter === s.name;
            return (
              <button
                key={s.name}
                type="button"
                className={`${styles.styleLeadPill} ${active ? styles.styleLeadPillActive : ''}`}
                onClick={() => setStyleFilter(active ? null : s.name)}
              >
                <span>{s.name}</span>
                <span className={styles.styleLeadCount}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Style Filter BottomSheet */}
      <BottomSheet
        isOpen={isStyleSheetOpen}
        onClose={() => setIsStyleSheetOpen(false)}
        title="Reach Clients by Style"
      >
        <p className={styles.sheetSubtitle}>
          Pick a garment style to see every client who loves or wears it, then send them new designs on WhatsApp.
        </p>
        {availableStyles.length === 0 ? (
          <p className={styles.noStylesHint}>
            No client styles recorded yet — styles appear automatically as you add client orders or preferred styles.
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
                  <div className={styles.styleFilterPhoto} aria-hidden="true">
                    <Symbol name="checkroom" size={24} />
                  </div>
                )}
                <span className={styles.styleCardName}>{s.name}</span>
                <span className={styles.styleCardMeta}>
                  {s.count} {s.count === 1 ? 'client' : 'clients'}
                </span>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ── 3. Guided Outbound Style Leads Card ── */}
      {styleFilter && (() => {
        const notYetContactedCount = filtered.filter((c) => !outreachMap[c.id]).length;
        const contactedCount = filtered.length - notYetContactedCount;
        const targetCount = notYetContactedCount > 0 ? notYetContactedCount : filtered.length;

        return (
          <div className={styles.outboundLeadCard}>
            <div className={styles.outboundLeadHeader}>
              <div className={styles.outboundLeadTitleGroup}>
                <div className={styles.outboundLeadBadgeIcon}>
                  <Symbol name="campaign" size={18} />
                </div>
                <div className={styles.outboundLeadTextCol}>
                  <div className={styles.outboundLeadTitleRow}>
                    <span className={styles.outboundLeadTitle}>{styleFilter} Outbound Leads</span>
                    <span className={styles.outboundLeadCountPill}>
                      {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
                    </span>
                  </div>
                  <p className={styles.outboundLeadSub}>
                    {notYetContactedCount > 0
                      ? `${notYetContactedCount} ready to message${contactedCount > 0 ? ` · ${contactedCount} already messaged` : ''}`
                      : `All ${filtered.length} matching clients have been messaged`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.outboundClearBtn}
                onClick={() => setStyleFilter(null)}
                aria-label={`Clear ${styleFilter} filter`}
              >
                <Symbol name="close" size={14} />
              </button>
            </div>

            {filtered.length > 0 && (
              <>
                <div className={styles.outboundLeadActions}>
                  <button
                    type="button"
                    className={styles.outboundPrimaryBtn}
                    onClick={() => openOutreachSheet(true)}
                  >
                    <WhatsappIcon size={16} />
                    <span>
                      {notYetContactedCount > 0
                        ? `Start WhatsApp Queue (${targetCount})`
                        : `Message Again (${targetCount})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.outboundSecondaryBtn}
                    onClick={() => openOutreachSheet(false)}
                  >
                    <Symbol name="edit" size={15} />
                    <span>Customize</span>
                  </button>
                </div>
                <p className={styles.outboundQuickTip}>
                  Tip: Tap <strong>Start WhatsApp Queue</strong> to message clients one by one, or tap the green WhatsApp button on any client row below.
                </p>
              </>
            )}
          </div>
        );
      })()}

      {/* Outreach Sheet */}
      <BottomSheet
        isOpen={isOutreachSheetOpen}
        onClose={closeOutreachSheet}
        title={outreachStep === 'compose' ? `${styleFilter} Outbound Leads` : `${styleFilter} Outreach Queue`}
      >
        {outreachStep === 'compose' ? (
          <div className={styles.composeWrap}>
            <div className={styles.composeSectionHeader}>
              <span className={styles.composeLabel}>1. Outfit or Lookbook Link</span>
              <Link
                href={matchingAlbum ? ROUTES.catalogueDetail(matchingAlbum.id) : ROUTES.catalogues}
                className={styles.manageGalleryLink}
              >
                + Manage in Lookbooks
              </Link>
            </div>
            {outreachPhotos.length > 0 || matchingAlbumUrl ? (
              <div className={styles.styleFilterGrid}>
                {matchingAlbumUrl && (
                  <button
                    type="button"
                    className={`${styles.styleFilterCard} ${selectedPhoto === null ? styles.styleFilterCardSelected : ''}`}
                    onClick={() => {
                      setSelectedPhoto(null);
                      setNoteText(getDefaultOutreachNote(styleFilter, false));
                    }}
                  >
                    <div className={`${styles.styleFilterPhoto} ${styles.textOnlyCardBox}`}>
                      <Symbol name="collections_bookmark" size={24} />
                    </div>
                    <span>All Looks Link</span>
                  </button>
                )}
                {outreachPhotos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.styleFilterCard} ${selectedPhoto?.id === p.id ? styles.styleFilterCardSelected : ''}`}
                    onClick={() => {
                      setSelectedPhoto(p);
                      setNoteText(getDefaultOutreachNote(styleFilter, true));
                    }}
                  >
                    <div className={styles.styleFilterPhoto}>
                      <Image src={p.photoUrl} alt="" width={200} height={200} />
                    </div>
                    <span>{p.label || 'Look'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.noPhotoCallout}>
                <Symbol name="chat" size={16} />
                <span>
                  Sending personalized WhatsApp note directly. You can also{' '}
                  <Link href={ROUTES.catalogues}>create a {styleFilter} Lookbook</Link> anytime.
                </span>
              </div>
            )}

            <span className={styles.composeLabel}>2. Personalized WhatsApp Message (uses {'{name}'} automatically)</span>
            <textarea
              className={styles.noteInput}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />

            <span className={styles.composeLabel}>3. Recipients</span>
            <div className={styles.pillTrack}>
              <button
                type="button"
                className={`${styles.softPill} ${selectionMode === 'everyone' ? styles.softPillActive : ''}`}
                onClick={() => setSelectionMode('everyone')}
              >
                <span>All Matching ({filtered.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.softPill} ${selectionMode === 'choose' ? styles.softPillActive : ''}`}
                onClick={() => setSelectionMode('choose')}
              >
                <span>Pick Specific Clients</span>
              </button>
            </div>

            {(() => {
              const notYetContacted = filtered.filter((c) => !outreachMap[c.id]);
              const everyoneTarget = includeContacted || notYetContacted.length === 0 ? filtered : notYetContacted;
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
                          {outreachMap[c.id] && <span className={styles.pickContactedTag}>Messaged</span>}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.startBtn}
                      disabled={queueTarget.length === 0}
                      onClick={() => startQueue(queueTarget)}
                    >
                      {queueTarget.length === 0
                        ? 'Select at least one client'
                        : `Start Queue (${queueTarget.length} ${queueTarget.length === 1 ? 'client' : 'clients'})`}
                    </button>
                  </>
                );
              }

              return (
                <>
                  {filtered.length > notYetContacted.length && notYetContacted.length > 0 && (
                    <label className={styles.includeContactedRow}>
                      <input
                        type="checkbox"
                        checked={includeContacted}
                        onChange={(e) => setIncludeContacted(e.target.checked)}
                      />
                      Include {filtered.length - notYetContacted.length} already messaged
                    </label>
                  )}
                  <button
                    type="button"
                    className={styles.startBtn}
                    disabled={queueTarget.length === 0}
                    onClick={() => startQueue(queueTarget)}
                  >
                    {`Start WhatsApp Queue (${queueTarget.length} ${queueTarget.length === 1 ? 'client' : 'clients'})`}
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
                <p>All done — you have reached out to everyone in this queue.</p>
                <button type="button" className={styles.startBtn} onClick={closeOutreachSheet}>Done</button>
              </div>
            ) : (
              <>
                <div className={styles.queueTopMeta}>
                  <span className={styles.queuePosition}>
                    Client {queueIndex + 1} of {queueList.length}
                  </span>
                  <button
                    type="button"
                    className={styles.queueEditNoteBtn}
                    onClick={() => setOutreachStep('compose')}
                  >
                    <Symbol name="edit" size={13} /> Edit message
                  </button>
                </div>
                <div className={styles.queueCard}>
                  <Avatar name={queueList[queueIndex].fullName} size="md" shape="circle" />
                  <div>
                    <p className={styles.queueName}>{queueList[queueIndex].fullName}</p>
                    <p className={styles.queuePhone}>{formatPhone(queueList[queueIndex].whatsappNumber)}</p>
                    {outreachMap[queueList[queueIndex].id] && (
                      <span className={styles.contactedTag}>
                        Messaged {formatDate(outreachMap[queueList[queueIndex].id])}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Outfit Switcher Rail (Pick different look per client in 1 tap) ── */}
                {(outreachPhotos.length > 0 || matchingAlbumUrl) && (
                  <div className={styles.queueOutfitSection}>
                    <div className={styles.queueOutfitHeader}>
                      <span className={styles.queueOutfitTitle}>Select Outfit for this Client</span>
                      {selectedPhoto && (
                        <span className={styles.queueOutfitBadge}>{selectedPhoto.label || 'Selected Look'}</span>
                      )}
                      {!selectedPhoto && matchingAlbumUrl && (
                        <span className={styles.queueOutfitBadge}>Full Album Link</span>
                      )}
                    </div>
                    <div className={styles.queueOutfitTrack}>
                      {matchingAlbumUrl && (
                        <button
                          type="button"
                          className={`${styles.queueOutfitPill} ${selectedPhoto === null ? styles.queueOutfitPillActive : ''}`}
                          onClick={() => setSelectedPhoto(null)}
                        >
                          <Symbol name="collections_bookmark" size={13} />
                          <span>All Looks Link</span>
                        </button>
                      )}
                      {outreachPhotos.map((p) => {
                        const isSel = selectedPhoto?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`${styles.queueOutfitThumb} ${isSel ? styles.queueOutfitThumbActive : ''}`}
                            onClick={() => setSelectedPhoto(p)}
                            title={p.label || 'Select look'}
                          >
                            <img src={p.photoUrl} alt="" className={styles.queueOutfitImg} />
                            <span className={styles.queueOutfitLabel}>{p.label || 'Look'}</span>
                          </button>
                        );
                      })}
                      {matchingAlbum && (
                        <Link
                          href={ROUTES.catalogueDetail(matchingAlbum.id)}
                          className={styles.queueAddLookBtn}
                          target="_blank"
                        >
                          <Symbol name="add" size={13} />
                          <span>Add Look</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {selectedPhoto ? (
                  <div className={styles.queuePreviewPhoto}>
                    <Image src={selectedPhoto.photoUrl} alt="" width={200} height={200} />
                  </div>
                ) : matchingAlbumUrl ? (
                  <div className={styles.queueAlbumPreviewCard}>
                    <div className={styles.queueAlbumIconBox}>
                      <Symbol name="collections_bookmark" size={22} />
                    </div>
                    <div className={styles.queueAlbumTextCol}>
                      <span className={styles.queueAlbumTitle}>{matchingAlbum?.title || styleFilter} Lookbook</span>
                      <span className={styles.queueAlbumSub}>Client receives direct link to browse all outfits & tap to order</span>
                    </div>
                  </div>
                ) : null}

                <p className={styles.queueNotePreview}>
                  {(noteText || getDefaultOutreachNote(styleFilter, Boolean(selectedPhoto))).replace(
                    /\{name\}/g,
                    queueList[queueIndex].fullName.split(' ')[0]
                  )}
                </p>
                <div className={styles.queueActions}>
                  <button type="button" className={styles.skipBtn} onClick={() => setQueueIndex((i) => i + 1)}>
                    Skip
                  </button>
                  <button type="button" className={styles.shareBtn} disabled={sharing} onClick={handleShareToCurrent}>
                    {sharing ? (
                      <Symbol name="progress_activity" className="global-spinner" />
                    ) : selectedPhoto ? (
                      <Symbol name="ios_share" size={17} />
                    ) : (
                      <WhatsappIcon size={16} />
                    )}
                    <span>{selectedPhoto ? 'Share Photo & Note' : 'Send on WhatsApp'}</span>
                  </button>
                </div>
                <button type="button" className={styles.markSentLink} onClick={handleMarkSentManually}>
                  Already messaged — mark as contacted & next
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

              const isContactedForStyle = Boolean(styleFilter && outreachMap[c.id]);

              // Contextual WhatsApp greeting (automatically switches to Outbound Style Pitch when a style filter is active)
              const whatsappGreeting = styleFilter
                ? (noteText || getDefaultOutreachNote(styleFilter, Boolean(outreachPhotos[0]))).replace(
                  /\{name\}/g,
                  c.fullName.split(' ')[0]
                )
                : isReady
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
                      {styleFilter && (
                        isContactedForStyle ? (
                          <span className={styles.contactedLeadPill}>
                            <Symbol name="check_circle" size={11} /> Messaged
                          </span>
                        ) : (
                          <span className={styles.leadMatchPill}>{styleFilter}</span>
                        )
                      )}
                    </div>
                    <div className={styles.customerSubtitle}>
                      <span className={styles.subtitleText}>{subtitle}</span>
                    </div>
                  </div>

                  <div className={styles.rightActionCol}>
                    {hasBalance && (
                      <span className={styles.owesPill}>
                        {formatCurrency(stats.totalBalance, currentShop?.currency)}
                      </span>
                    )}
                    {isReady && !hasBalance && (
                      <span className={styles.readyPill}>Ready</span>
                    )}
                    <div className={styles.quickActionIcons} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={getTelLink(c.whatsappNumber)}
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
                        title={
                          styleFilter
                            ? `Send ${styleFilter} outreach message to ${c.fullName}`
                            : `WhatsApp ${c.fullName}`
                        }
                        onClick={() => {
                          if (styleFilter) {
                            void markCustomerContacted(c.id);
                          }
                        }}
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
