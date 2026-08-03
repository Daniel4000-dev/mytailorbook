'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaWhatsapp, FaTrash, FaSpinner } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import PhotoLightbox from '@/components/ui/PhotoLightbox/PhotoLightbox';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import Input from '@/components/ui/Input/Input';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { ORDER_STATUSES, STATUS_CONFIG, MEASUREMENT_LABELS, getNextStatus } from '@/lib/constants';
import { APP_CONFIG } from '@/lib/config';
import { formatCurrency, formatNumber, formatDate, getWhatsAppLink, getOrderProgressMessage } from '@/lib/formatters';
import { getBalanceOwed, getMargin, hasCostData, isOverdue, hasUnreadComment, isOwnerLikeRole } from '@/lib/types';
import { getOrderCommentsAction, getBatchOrdersAction, deleteOrderAction } from '@/app/actions';
import type { Order, OrderPhoto, OrderComment, Priority } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { compressImage } from '@/lib/compressImage';
import { FREE_ORDER_PROGRESS_PHOTO_LIMIT, FREE_ORDER_INSPIRATION_PHOTO_LIMIT, PREMIUM_STATUSES } from '@/lib/subscription';
import OrderMeasurementsSheet from './_components/OrderMeasurementsSheet';
import styles from './page.module.css';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role || 'Staff';
  const isOwnerView = isOwnerLikeRole(userRole);
  const { orders, customers, staffMembers, currentShop, isLoaded, updateOrderStatus, updateOrder } = useData();
  const { showToast } = useToast();

  const order = orders.find((o) => o.id === orderId) || null;
  const customer = order ? customers.find((c) => c.id === order.customerId) || null : null;

  const [comments, setComments] = useState<OrderComment[]>([]);
  const [batchSiblings, setBatchSiblings] = useState<Order[]>([]);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingInspo, setUploadingInspo] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [clearFull, setClearFull] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [confirmingFullPay, setConfirmingFullPay] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [editingMeasurements, setEditingMeasurements] = useState(false);

  const handleDeleteOrder = async () => {
    setDeletingOrder(true);
    const { error } = await deleteOrderAction(orderId);
    if (error) {
      showToast(error, 'error');
      setDeletingOrder(false);
      setConfirmingDelete(false);
      return;
    }
    showToast('Order deleted', 'success');
    router.push('/production');
  };
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('normal');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editTotalBill, setEditTotalBill] = useState('');
  const [editMaterialSuppliedBy, setEditMaterialSuppliedBy] = useState<'shop' | 'customer'>('shop');
  const [editMaterialCost, setEditMaterialCost] = useState('');
  const [editOtherCosts, setEditOtherCosts] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!order) return;
    getOrderCommentsAction(order.id).then(setComments).catch(() => {});
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening the page counts as reading any new customer comments —
  // clears the unread badge on the board/dashboard.
  useEffect(() => {
    if (order && hasUnreadComment(order)) {
      updateOrder(order.id, { commentsSeenAt: new Date().toISOString() }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.lastCommentAt]);

  useEffect(() => {
    const fetchSiblings = order?.batchId
      ? getBatchOrdersAction(order.batchId, order.id)
      : Promise.resolve([]);
    fetchSiblings.then(setBatchSiblings).catch(() => {});
  }, [order?.batchId, order?.id]);

  const stageEntry = useMemo(() => {
    if (!order) return null;
    const entries = order.statusHistory.filter((h) => h.to === order.status);
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }, [order]);

  if (isLoaded && !order) {
    return (
      <PageLayout header={<TopBar title="Order" showBack />}>
        <EmptyState icon={<Symbol name="search_off" size={40} />} title="Order not found" description="It may have been removed, or the link is wrong." />
      </PageLayout>
    );
  }

  if (!order) {
    return <PageLayout header={<TopBar title="Order" showBack />}><div /></PageLayout>;
  }

  const next = getNextStatus(order.status);
  const balanceOwed = getBalanceOwed(order);
  const orderRef = order.id.slice(0, 4).toUpperCase();
  // Always the canonical production domain, not whatever host this
  // request happened to come in on (e.g. a Vercel preview deployment) —
  // this link goes straight into a WhatsApp message sent to the customer.
  const trackingUrl = `${APP_CONFIG.baseUrl}/track/${order.id}`;
  // null/undefined means "never overridden" — inherit the shop's own default.
  const includeTrackingLink = order.includeTrackingLink ?? currentShop?.defaultTrackingLinkEnabled ?? true;
  const whatsAppMessage = customer
    ? getOrderProgressMessage({
        customerName: customer.fullName,
        shopName: currentShop?.name || 'us',
        status: order.status,
        trackingUrl,
        customTemplate: currentShop?.stageMessageTemplates?.[order.status],
        includeTrackingLink,
      })
    : undefined;

  const handleToggleTrackingLink = (checked: boolean) => {
    updateOrder(order.id, { includeTrackingLink: checked }).catch(() => {
      showToast('Could not update this setting', 'error');
    });
  };

  const handleAdvance = async () => {
    if (!next) return;
    setAdvancing(true);
    try {
      await updateOrderStatus(order.id, next, user?.uid || '', user?.name || '');
      showToast(`Moved to ${STATUS_CONFIG[next].label}`, 'success');
    } finally {
      setAdvancing(false);
    }
  };

  const handleSaveNotes = async () => {
    if (notesDraft === null || notesDraft.trim() === '') return;
    setSavingNotes(true);
    try {
      await updateOrder(order.id, { orderDetails: notesDraft.trim() });
      setNotesDraft(null);
      showToast('Order notes saved', 'success');
    } finally {
      setSavingNotes(false);
    }
  };

  const startEditing = () => {
    setEditDueDate(order.dueDate ? order.dueDate.slice(0, 10) : '');
    setEditPriority(order.priority);
    setEditAssignedTo(order.assignedTo || '');
    setEditTotalBill(String(order.totalBill));
    setEditMaterialSuppliedBy(order.materialSuppliedBy || 'shop');
    setEditMaterialCost(order.materialCost ? String(order.materialCost) : '');
    setEditOtherCosts(order.otherCosts ? String(order.otherCosts) : '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const assignee = staffMembers.find((s) => s.uid === editAssignedTo);
      await updateOrder(order.id, {
        // Pass '' rather than undefined for "cleared" fields — the update
        // mapper treats undefined as "leave unchanged", so undefined here
        // would silently fail to actually clear the due date/assignee.
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : '',
        priority: editPriority,
        assignedTo: editAssignedTo,
        assignedToName: assignee?.name || '',
        totalBill: parseInt(editTotalBill.replace(/,/g, '')) || 0,
        materialSuppliedBy: editMaterialSuppliedBy,
        materialCost: editMaterialSuppliedBy === 'shop' ? (parseInt(editMaterialCost.replace(/,/g, '')) || 0) : 0,
        otherCosts: parseInt(editOtherCosts.replace(/,/g, '')) || 0,
      });
      setIsEditing(false);
      showToast('Order updated', 'success');
    } finally {
      setSavingEdit(false);
    }
  };

  const uploadToStorage = async (rawFile: File, subdir: string) => {
    // Uploaded straight to Supabase Storage from the browser — bypassing
    // the Next.js Server Action that `updateOrder` goes through, which
    // caps request bodies at 1MB by default. Only the short public URL
    // gets saved to the order.
    const file = await compressImage(rawFile);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${order.shopId}/${order.id}/${subdir}${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('order-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;
  };

  const removeFromStorage = async (url: string) => {
    const marker = '/order-photos/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex !== -1) {
      const supabase = createClient();
      await supabase.storage.from('order-photos').remove([url.slice(markerIndex + marker.length)]);
    }
  };

  const isPremium = !!currentShop && PREMIUM_STATUSES.includes(currentShop.subscriptionStatus);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!isPremium && (order.images?.length || 0) + files.length > FREE_ORDER_PROGRESS_PHOTO_LIMIT) {
      showToast(`Free plan limit: ${FREE_ORDER_PROGRESS_PHOTO_LIMIT} progress photos per order. Upgrade to add more.`, 'error');
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    try {
      const uploaded: OrderPhoto[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToStorage(file, '');
        // Tagged with the order's CURRENT stage — lets the tracking page
        // show a real cutting -> sewing -> ready photo story.
        uploaded.push({ url, stage: order.status, uploadedAt: new Date().toISOString() });
      }
      await updateOrder(order.id, { images: [...(order.images || []), ...uploaded] });
      showToast(uploaded.length > 1 ? `${uploaded.length} photos added` : 'Photo added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const removed = (order.images || [])[index];
    await updateOrder(order.id, { images: (order.images || []).filter((_, i) => i !== index) });
    if (removed) await removeFromStorage(removed.url);
  };

  const handleInspoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!isPremium && (order.inspirationImages?.length || 0) + files.length > FREE_ORDER_INSPIRATION_PHOTO_LIMIT) {
      showToast(`Free plan limit: ${FREE_ORDER_INSPIRATION_PHOTO_LIMIT} inspiration photos per order. Upgrade to add more.`, 'error');
      e.target.value = '';
      return;
    }
    setUploadingInspo(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        uploadedUrls.push(await uploadToStorage(file, 'inspo/'));
      }
      await updateOrder(order.id, { inspirationImages: [...(order.inspirationImages || []), ...uploadedUrls] });
      showToast(uploadedUrls.length > 1 ? `${uploadedUrls.length} inspiration photos added` : 'Inspiration photo added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingInspo(false);
      e.target.value = '';
    }
  };

  const handleRemoveInspo = async (index: number) => {
    const removed = (order.inspirationImages || [])[index];
    await updateOrder(order.id, { inspirationImages: (order.inspirationImages || []).filter((_, i) => i !== index) });
    if (removed) await removeFromStorage(removed);
  };

  const handleRecordPayment = async (amount: number) => {
    if (amount <= 0) return;
    setRecordingPayment(true);
    try {
      const newDeposit = Math.min(order.totalBill, order.depositPaid + amount);
      await updateOrder(order.id, {
        depositPaid: newDeposit,
        payments: [
          ...(order.payments || []),
          {
            id: `pay-${Date.now()}`,
            amount,
            recordedBy: user?.uid || '',
            recordedByName: user?.name || 'Unknown',
            timestamp: new Date().toISOString(),
          },
        ],
      });
      setPaymentAmount('');
      setClearFull(false);
      showToast(`Payment of ${formatCurrency(amount)} recorded`, 'success');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const staffOptions = [
    { value: '', label: 'Unassigned' },
    ...staffMembers
      .filter((s) => s.active !== false || s.uid === order.assignedTo)
      .map((s) => ({ value: s.uid, label: s.uid === user?.uid ? `${s.name} (You)` : s.name })),
  ];

  const priorityOptions: { value: Priority; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'rush', label: 'Rush' },
  ];

  // This garment's own recorded measurements are the source of truth for
  // cutting/sewing it — they can deliberately differ from the customer's
  // general body profile (e.g. a loose Agbada's ease vs. a fitted
  // Senator). Only fall back to the body profile if this order was
  // created without any measurements of its own (e.g. skipped at the
  // wizard's measure step to take at fitting).
  const orderMeasurementEntries = Object.entries(order.measurements || {}).filter(
    ([key, value]) => key !== 'notes' && value !== undefined && value !== null && value !== ''
  );
  const usingOrderMeasurements = orderMeasurementEntries.length > 0;
  const measurementEntries = usingOrderMeasurements
    ? orderMeasurementEntries
    : Object.entries(customer?.measurements || {}).filter(
        ([key, value]) => key !== 'notes' && value !== undefined && value !== null && value !== ''
      );

  return (
    <PageLayout
      header={
        <TopBar
          title={`Order #${orderRef}`}
          showBack
          onBack={() => router.push('/production')}
          rightAction={<NotificationBell />}
        />
      }
    >
      <div className={styles.detailWrapper}>
        {/* 1. Move to next stage */}
        {next && (
          <div className={styles.advanceRow}>
            <button type="button" className={styles.advanceBtn} onClick={handleAdvance} disabled={advancing}>
              <>
                {advancing && <FaSpinner className="global-spinner" />}
                <Symbol name={next === 'Cutting' ? 'content_cut' : 'arrow_forward'} size={20} />
                Move to {STATUS_CONFIG[next].label}
              </>
            </button>
          </div>
        )}

        {/* 2. Order / customer header */}
        <section className={styles.card}>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <div className={styles.avatarLarge}>{order.customerName ? order.customerName[0].toUpperCase() : '?'}</div>
              <div>
                <h2 className={styles.customerName}>{order.customerName}</h2>
                <p className={styles.garmentSubtitle}>{order.orderDetails}</p>
              </div>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.stagePill} style={{ background: STATUS_CONFIG[order.status].bgColor }}>
                {STATUS_CONFIG[order.status].label} Stage
              </span>
              {customer && (
                <a
                  className={styles.callBtn}
                  href={`tel:+${customer.whatsappNumber}`}
                  aria-label={`Call ${customer.fullName}`}
                >
                  <Symbol name="call" size={20} />
                </a>
              )}
            </div>
          </div>
          {(isOverdue(order) || order.priority !== 'normal') && (
            <div className={styles.flagRow}>
              {isOverdue(order) && <span className={styles.flagChip}>Overdue</span>}
              {order.priority !== 'normal' && (
                <span className={styles.flagChip}>{order.priority === 'rush' ? 'Rush' : 'Urgent'}</span>
              )}
            </div>
          )}
        </section>

        {/* 3. Metadata */}
        <section className={styles.card}>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Assigned To</span>
              <div className={styles.metaAssignee}>
                <span className={styles.metaAvatar}>
                  {(order.assignedToName || '—').slice(0, 2).toUpperCase()}
                </span>
                <span className={styles.metaValueBold}>{order.assignedToName || 'Unassigned'}</span>
              </div>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Due Date</span>
              <span className={`${styles.metaValueBold} ${isOverdue(order) ? styles.overdueText : ''}`}>
                {order.dueDate
                  ? new Date(order.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Not set'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Created</span>
              <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Current Stage Entry</span>
              <span className={styles.metaValue}>
                {stageEntry ? `Entered ${STATUS_CONFIG[order.status].label} on ${formatDate(stageEntry.timestamp)}` : '—'}
              </span>
            </div>
          </div>
          {isOwnerView && !isEditing && (
            <button type="button" className={styles.metaEditBtn} onClick={startEditing} aria-label="Edit order">
              <Symbol name="edit" size={18} />
            </button>
          )}
          {isEditing && (
            <div className={styles.editForm}>
              <div className={styles.editRow}>
                <Input label="Due Date" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                <Select
                  label="Priority"
                  options={priorityOptions}
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                />
              </div>
              <div className={styles.editRow}>
                <Select
                  label="Assign To"
                  options={staffOptions}
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                />
                <MoneyInput
                  label="Total Bill (₦)"
                  value={editTotalBill}
                  onChange={setEditTotalBill}
                />
              </div>
              {FEATURE_FLAGS.costMarginTracking && (
                <>
                  <div className={styles.editRow}>
                    <Select
                      label="Material Supplied By"
                      options={[
                        { value: 'shop', label: 'Shop' },
                        { value: 'customer', label: 'Customer' },
                      ]}
                      value={editMaterialSuppliedBy}
                      onChange={(e) => setEditMaterialSuppliedBy(e.target.value as 'shop' | 'customer')}
                    />
                    {editMaterialSuppliedBy === 'shop' && (
                      <MoneyInput
                        label="Material Cost (₦)"
                        value={editMaterialCost}
                        onChange={setEditMaterialCost}
                      />
                    )}
                  </div>
                  <div className={styles.editRow}>
                    <MoneyInput
                      label="Other Costs (₦)"
                      value={editOtherCosts}
                      onChange={setEditOtherCosts}
                      placeholder="Thread, buttons, outsourced labor…"
                    />
                  </div>
                </>
              )}
              <div className={styles.editActions}>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" loading={savingEdit} onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </section>

        {/* 4. Inspiration */}
        <section className={styles.card + ' ' + styles.flushCard}>
          <div className={styles.capsHeader}>
            <h3 className={styles.capsTitle}>Inspiration</h3>
            {!isPremium && (order.inspirationImages?.length || 0) >= FREE_ORDER_INSPIRATION_PHOTO_LIMIT ? (
              <span className={styles.emptyNote}>Free plan limit reached ({FREE_ORDER_INSPIRATION_PHOTO_LIMIT})</span>
            ) : (
              <label className={styles.addLink}>
                <input type="file" accept="image/*" multiple hidden onChange={handleInspoUpload} disabled={uploadingInspo} />
                <Symbol name="add_photo_alternate" size={18} />
                {uploadingInspo ? 'Uploading…' : 'Add'}
              </label>
            )}
          </div>
          {(order.inspirationImages || []).length === 0 ? (
            <p className={styles.emptyNote}>No reference photo yet — add one if the customer has an inspo they want matched.</p>
          ) : (
            <div className={styles.inspoGrid}>
              {(order.inspirationImages || []).map((url, i) => (
                <div key={i} className={styles.inspoThumb}>
                  <Image
                    src={url}
                    alt={`Inspiration ${i + 1}`}
                    width={400}
                    height={400}
                    onClick={(e) => setLightbox({ src: url, rect: e.currentTarget.getBoundingClientRect() })}
                    style={{ cursor: 'zoom-in' }}
                  />
                  <button type="button" className={styles.photoRemoveBtn} onClick={() => handleRemoveInspo(i)} aria-label="Remove inspiration photo">
                    <Symbol name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. Order notes */}
        <section className={styles.card}>
          <div className={styles.capsHeader + ' ' + styles.capsHeaderPlain}>
            <h3 className={styles.capsTitle}>Order Notes</h3>
            <Symbol name="sticky_note_2" size={16} className={styles.capsIcon} />
          </div>
          <textarea
            className={styles.notesArea}
            value={notesDraft ?? order.orderDetails}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add garment details and tailor notes here…"
          />
          <button
            type="button"
            className={styles.saveNoteBtn}
            onClick={handleSaveNotes}
            disabled={savingNotes || notesDraft === null || notesDraft.trim() === '' || notesDraft === order.orderDetails}
          >
            {savingNotes && <FaSpinner className="global-spinner" />}
            Save Note
          </button>
        </section>

        {/* 6. Progress gallery */}
        <section className={styles.card + ' ' + styles.flushCard}>
          <div className={styles.capsHeader}>
            <h3 className={styles.capsTitle}>Progress Gallery</h3>
            {!isPremium && (order.images?.length || 0) >= FREE_ORDER_PROGRESS_PHOTO_LIMIT ? (
              <span className={styles.emptyNote}>Free plan limit reached ({FREE_ORDER_PROGRESS_PHOTO_LIMIT})</span>
            ) : (
              <label className={styles.addLink}>
                <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                <Symbol name="add_a_photo" size={18} />
                {uploadingPhoto ? 'Uploading…' : 'Add'}
              </label>
            )}
          </div>
          {(order.images || []).length === 0 ? (
            <p className={styles.emptyNote}>No progress photos yet — snap one as the garment moves through each stage.</p>
          ) : (
            <div className={styles.galleryGrid}>
              {(order.images || []).map((photo, i) => (
                <div key={i} className={styles.galleryThumb}>
                  <Image src={photo.url} alt={`${photo.stage} progress`} width={400} height={400} />
                  <div className={styles.glassCaption}>
                    {photo.stage} · {new Date(photo.uploadedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  </div>
                  <button type="button" className={styles.photoRemoveBtn} onClick={() => handleRemovePhoto(i)} aria-label="Remove photo">
                    <Symbol name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Customer comments (from the public tracking page) */}
        {comments.length > 0 && (
          <section className={styles.card}>
            <div className={styles.capsHeader + ' ' + styles.capsHeaderPlain}>
              <h3 className={styles.capsTitle}>Customer Comments</h3>
              <Symbol name="chat_bubble" size={16} className={styles.capsIcon} />
            </div>
            <div className={styles.commentList}>
              {comments.map((c) => (
                <div key={c.id} className={styles.commentRow}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentStage}>{c.stage}</span>
                    <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
                  </div>
                  <p className={styles.commentMessage}>{c.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Batch siblings */}
        {batchSiblings.length > 0 && (
          <section className={styles.card}>
            <div className={styles.capsHeader + ' ' + styles.capsHeaderPlain}>
              <h3 className={styles.capsTitle}>From the Same Visit ({batchSiblings.length + 1} items)</h3>
              <Symbol name="layers" size={16} className={styles.capsIcon} />
            </div>
            <div className={styles.batchList}>
              {batchSiblings.map((sibling) => (
                <Link key={sibling.id} href={`/production/${sibling.id}`} className={styles.batchRow}>
                  <span className={styles.batchDetails}>{sibling.orderDetails}</span>
                  <span className={styles.stageChipSm} style={{ background: STATUS_CONFIG[sibling.status].bgColor }}>
                    {sibling.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. Measurements */}
        <section className={styles.card}>
          <div className={styles.sectionHeaderRow}>
            <h3 className={styles.sectionTitle}>
              {usingOrderMeasurements ? 'Measurements (this order)' : "Measurements (customer's body profile)"}
            </h3>
            <button
              type="button"
              className={styles.roundIconBtn}
              aria-label="Edit this order's measurements"
              onClick={() => setEditingMeasurements(true)}
            >
              <Symbol name="edit" size={20} />
            </button>
          </div>
          {measurementEntries.length === 0 ? (
            <p className={styles.emptyNote}>No measurements on file for this order or customer yet.</p>
          ) : (
            <>
              <div className={styles.measureGrid}>
                {measurementEntries.map(([key, value]) => (
                  <div key={key} className={styles.measureRow}>
                    <span className={styles.measureLabel}>{MEASUREMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</span>
                    <span className={styles.measureValue}>{value}&quot;</span>
                  </div>
                ))}
              </div>
              {!usingOrderMeasurements && (
                <p className={styles.emptyNote}>No measurements were recorded for this specific order — showing the customer&apos;s general body profile instead.</p>
              )}
            </>
          )}
        </section>

        {/* 8. Payment summary (owner only) */}
        {isOwnerView && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Payment Summary</h3>
            <div className={styles.payRows}>
              <div className={styles.payRow}>
                <span className={styles.payLabel}>Total Bill</span>
                <span className={styles.payValue}>{formatCurrency(order.totalBill)}</span>
              </div>
              <div className={styles.payRow}>
                <span className={styles.payLabel}>Deposit Paid</span>
                <span className={styles.payValueAccent}>-{formatCurrency(order.depositPaid)}</span>
              </div>
              <div className={styles.payRowTotal}>
                <span>Balance Owed</span>
                <span className={balanceOwed > 0 ? styles.balanceDue : undefined}>{formatCurrency(balanceOwed)}</span>
              </div>
            </div>

            {balanceOwed > 0 && (
              <div className={styles.payForm}>
                <label className={styles.capsLabel} htmlFor="record-deposit">Record Additional Deposit</label>
                <input
                  id="record-deposit"
                  className={styles.payInput}
                  placeholder="₦0.00"
                  inputMode="numeric"
                  value={clearFull ? formatNumber(balanceOwed) : (paymentAmount ? formatNumber(Number(paymentAmount)) : '')}
                  disabled={clearFull}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <label className={styles.checkboxRow} htmlFor="clear-balance">
                  <input
                    id="clear-balance"
                    type="checkbox"
                    checked={clearFull}
                    onChange={(e) => setClearFull(e.target.checked)}
                  />
                  Clear Full Balance ({formatCurrency(balanceOwed)})
                </label>
                <button
                  type="button"
                  className={styles.recordPayBtn}
                  disabled={recordingPayment || (!clearFull && !parseInt(paymentAmount))}
                  onClick={() =>
                    clearFull ? setConfirmingFullPay(true) : handleRecordPayment(parseInt(paymentAmount) || 0)
                  }
                >
                  {recordingPayment && <FaSpinner className="global-spinner" />} Record Payment
                </button>
              </div>
            )}

            {order.payments && order.payments.length > 0 && (
              <div className={styles.payHistory}>
                <span className={styles.capsLabel}>Payment History</span>
                {order.payments.slice().reverse().map((p) => (
                  <div key={p.id} className={styles.payHistoryRow}>
                    <span className={styles.payHistoryAmount}>{formatCurrency(p.amount)}</span>
                    <span className={styles.payHistoryMeta}>{formatDate(p.timestamp)} · {p.recordedByName}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.receiptRow}>
              <a href={`/receipt/${order.id}`} target="_blank" rel="noopener noreferrer" className={styles.receiptLink}>
                <Symbol name="receipt" size={16} /> View/Print Receipt
              </a>
            </div>
          </section>
        )}

        {/* 8b. Cost & margin (owner only) */}
        {isOwnerView && FEATURE_FLAGS.costMarginTracking && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Cost &amp; Margin</h3>
            {hasCostData(order) ? (
              <div className={styles.payRows}>
                <div className={styles.payRow}>
                  <span className={styles.payLabel}>Material Cost</span>
                  <span className={styles.payValueAccent}>
                    -{formatCurrency(order.materialSuppliedBy === 'customer' ? 0 : order.materialCost || 0)}
                  </span>
                </div>
                <div className={styles.payRow}>
                  <span className={styles.payLabel}>Other Costs</span>
                  <span className={styles.payValueAccent}>-{formatCurrency(order.otherCosts || 0)}</span>
                </div>
                <div className={styles.payRowTotal}>
                  <span>Margin</span>
                  <span>
                    {formatCurrency(getMargin(order))}
                    {order.totalBill > 0 && ` (${Math.round((getMargin(order) / order.totalBill) * 100)}%)`}
                  </span>
                </div>
              </div>
            ) : (
              <p className={styles.emptyNote}>
                Add cost details to see your margin on this order.
              </p>
            )}
            {!isEditing && (
              <button type="button" className={styles.metaEditBtn} onClick={startEditing} aria-label="Edit cost details">
                <Symbol name="edit" size={18} />
              </button>
            )}
          </section>
        )}

        {/* 9. Share & communicate — the WhatsApp FAB already covers sending
             this exact stage update (same link/message), so no separate
             button is needed here. */}
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Share &amp; Communicate</h3>
          <div className={styles.trackBlock}>
            <span className={styles.capsLabel}>Public Tracking Link</span>
            <div className={styles.trackRow}>
              <span className={styles.trackUrl}>{trackingUrl.replace(/^https?:\/\//, '')}</span>
              <button type="button" className={styles.copyBtn} onClick={handleCopyLink} aria-label="Copy tracking link">
                {copied ? <Symbol name="check" size={16} /> : <Symbol name="content_copy" size={16} />}
              </button>
            </div>
          </div>
          <label className={styles.toggleRow}>
            <span>
              <span className={styles.toggleLabel}>Include in WhatsApp updates</span>
              <span className={styles.toggleHint}>
                Adds the tracking link above to this order&apos;s WhatsApp stage messages.
              </span>
            </span>
            <input
              type="checkbox"
              checked={includeTrackingLink}
              onChange={(e) => handleToggleTrackingLink(e.target.checked)}
            />
          </label>
        </section>

        {/* 10. Activity timeline — full pipeline, done/current/pending */}
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Activity Timeline</h3>
          <div className={styles.timeline}>
            {ORDER_STATUSES.map((status) => {
              const entry = order.statusHistory.filter((h) => h.to === status).pop();
              const currentIndex = ORDER_STATUSES.indexOf(order.status);
              const stepIndex = ORDER_STATUSES.indexOf(status);
              // The final stage (Completed/"Delivered") has no "next" to
              // move on to — once reached it's done, not still "current"
              // with an in-progress spinner.
              const isTerminal = status === 'Completed' && order.status === 'Completed';
              const state = stepIndex < currentIndex || isTerminal ? 'done' : stepIndex === currentIndex ? 'current' : 'pending';
              return (
                <div key={status} className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineDot} ${styles['dot_' + state]}`}>
                    <Symbol
                      name={state === 'done' ? 'check' : state === 'current' ? 'autorenew' : status === 'Completed' ? 'check_circle' : 'hourglass_empty'}
                      size={14}
                    />
                  </div>
                  <div>
                    <p className={`${styles.timelineTitle} ${state === 'pending' ? styles.timelineTitlePending : ''}`}>
                      {STATUS_CONFIG[status].label}{state === 'current' ? ' (Current)' : ''}
                    </p>
                    <p className={styles.timelineMeta}>
                      {entry
                        ? `${formatDate(entry.timestamp)}${entry.changedByName ? ` • ${entry.changedByName}` : ''}`
                        : state === 'pending' ? 'Pending' : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer actions — the "advance to next stage" action already lives
             at the top of the page (section 1), so only Mark Paid (unique,
             not shown elsewhere) belongs here. */}
        {isOwnerView && balanceOwed > 0 && (
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.markPaidBtn}
              disabled={recordingPayment}
              onClick={() => setConfirmingFullPay(true)}
            >
                <>
                  {recordingPayment && <FaSpinner className="global-spinner" />}
                  <Symbol name="check_circle" size={20} /> Mark Paid
                </>
            </button>
          </div>
        )}

        {isOwnerView && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Danger Zone</h3>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={deletingOrder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sf-space-sm)',
                padding: 'var(--sf-space-sm) var(--sf-space-md)',
                borderRadius: 'var(--sf-radius-md)',
                border: 'none',
                background: 'var(--sf-error-bg)',
                color: 'var(--sf-error)',
                fontWeight: 'var(--sf-weight-medium)',
                cursor: deletingOrder ? 'not-allowed' : 'pointer',
                opacity: deletingOrder ? 0.6 : 1,
                marginTop: 'var(--sf-space-sm)',
              }}
            >
                <>
                  {deletingOrder && <FaSpinner className="global-spinner" />}
                  <FaTrash /> Delete Order
                </>
            </button>
          </section>
        )}
      </div>

      {/* Floating WhatsApp shortcut — portaled straight to document.body,
          see FixedBottomPortal for why. */}
      {customer && (
        <FixedBottomPortal>
          <a
            href={getWhatsAppLink(customer.whatsappNumber, whatsAppMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappFab}
            aria-label={`WhatsApp ${customer.fullName}`}
          >
            <FaWhatsapp color="#FFFFFF" size={28} />
          </a>
        </FixedBottomPortal>
      )}

      <ConfirmDialog
        isOpen={confirmingFullPay}
        onClose={() => setConfirmingFullPay(false)}
        onConfirm={async () => {
          await handleRecordPayment(balanceOwed);
          setConfirmingFullPay(false);
        }}
        title="Clear full balance?"
        description={`This marks the remaining ${formatCurrency(balanceOwed)} as paid in full. Make sure the payment has actually been received before confirming.`}
        confirmLabel="Clear Balance"
        loading={recordingPayment}
      />

      <ConfirmDialog
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDeleteOrder}
        title="Delete this order?"
        description="This permanently deletes the order and all its photos. This cannot be undone."
        confirmLabel="Delete Order"
        loading={deletingOrder}
      />

      <PhotoLightbox
        src={lightbox?.src ?? null}
        originRect={lightbox?.rect ?? null}
        onClose={() => setLightbox(null)}
      />

      <OrderMeasurementsSheet
        isOpen={editingMeasurements}
        onClose={() => setEditingMeasurements(false)}
        order={order}
        customer={customer}
        currentShop={currentShop}
        onSave={async (measurements) => {
          await updateOrder(order.id, { measurements });
          showToast('Measurements updated', 'success');
        }}
      />
    </PageLayout>
  );
}
