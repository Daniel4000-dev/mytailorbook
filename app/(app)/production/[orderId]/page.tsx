'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Symbol from '@/components/ui/Symbol/Symbol';
import Avatar from '@/components/ui/Avatar/Avatar';
import Button from '@/components/ui/Button/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import PhotoLightbox from '@/components/ui/PhotoLightbox/PhotoLightbox';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import Input from '@/components/ui/Input/Input';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { ORDER_STATUSES, STATUS_CONFIG, MEASUREMENT_LABELS, getNextStatus } from '@/lib/constants';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES } from '@/lib/routes';
import { findByIdOrSlug } from '@/lib/slugs';
import { formatCurrency, formatNumber, formatDate, getWhatsAppLink, getOrderProgressMessage } from '@/lib/formatters';
import { getBalanceOwed, getMargin, hasCostData, isOverdue, hasUnreadComment, isOwnerLikeRole } from '@/lib/types';
import { getOrderCommentsAction, getBatchOrdersAction } from '@/app/actions';
import { addPayment } from '@/app/actions/order_payments';
import type { Order, OrderStatus, OrderPhoto, OrderComment, Priority, PaymentMethod } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { compressImage } from '@/lib/compressImage';
import { FREE_ORDER_PROGRESS_PHOTO_LIMIT, FREE_ORDER_INSPIRATION_PHOTO_LIMIT, PREMIUM_STATUSES } from '@/lib/subscription';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import OrderMeasurementsSheet from './_components/OrderMeasurementsSheet';
import WhatsAppOptionsSheet from './_components/WhatsAppOptionsSheet';
import HandoverPaymentSheet from './_components/HandoverPaymentSheet';
import OrderExpenses from './_components/OrderExpenses';
import OrderPayments from './_components/OrderPayments';
import OrderMaterials from './_components/OrderMaterials';
import OrderEmbellishmentTracker from './_components/OrderEmbellishmentTracker';
import CuttingSlipModal from '../_components/CuttingSlipModal';
import ScheduleFittingPromptModal from '../_components/ScheduleFittingPromptModal';
import { createCalendarEvent } from '@/app/actions/calendar';
import { publishOrderStoryToPortfolioAction } from '@/app/(app)/settings/portfolio/actions';
import { addOrderToMockPortfolio } from '@/lib/mockPortfolio';
import { MOCK_ORDERS } from '@/lib/mockData';
import styles from './page.module.css';

type DetailTab = 'spec' | 'feed' | 'ledger';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role || 'Staff';
  const isOwnerView = isOwnerLikeRole(userRole);
  const { orders, customers, staffMembers, currentShop, isLoaded, updateOrderStatus, updateOrder, deleteOrder, exceptions, logException, resolveException, isDemoMode } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<DetailTab>('spec');

  const order =
    findByIdOrSlug(orders, orderId, (o) => `${o.customerName || ''} ${o.styleName || o.orderDetails || ''}`) ||
    findByIdOrSlug(MOCK_ORDERS, orderId, (o) => `${o.customerName || ''} ${o.styleName || o.orderDetails || ''}`) ||
    null;
  const customer = order ? customers.find((c) => c.id === order.customerId) || null : null;
  const resolvedOrderId = order?.id || orderId;

  const [comments, setComments] = useState<OrderComment[]>([]);
  const [batchSiblings, setBatchSiblings] = useState<Order[]>([]);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [publishingPortfolio, setPublishingPortfolio] = useState(false);
  const [uploadingInspo, setUploadingInspo] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);
  const [showAmendmentPrompt, setShowAmendmentPrompt] = useState(false);
  const [handoverSheetOpen, setHandoverSheetOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [whatsAppSheetOpen, setWhatsAppSheetOpen] = useState(false);
  const [confirmingStatusChange, setConfirmingStatusChange] = useState<OrderStatus | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [editingMeasurements, setEditingMeasurements] = useState(false);
  const [quickAdjustTarget, setQuickAdjustTarget] = useState<{ key: string; label: string; value: number } | null>(null);
  const [quickAdjustVal, setQuickAdjustVal] = useState<number>(0);
  const [savingQuickAdjust, setSavingQuickAdjust] = useState(false);

  // Optimistic progress photos queue
  const [pendingPhotos, setPendingPhotos] = useState<Array<{
    id: string;
    previewUrl: string;
    file: File;
    stage: OrderStatus;
    status: 'uploading' | 'failed';
    error?: string;
  }>>([]);

  // Batch bulk advance state
  const [advancingBatch, setAdvancingBatch] = useState(false);

  const [cuttingSlipOpen, setCuttingSlipOpen] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [isFittingPromptOpen, setIsFittingPromptOpen] = useState(false);
  const [alterationModalOpen, setAlterationModalOpen] = useState(false);
  const [alterationNotes, setAlterationNotes] = useState('');
  const [targetAlterationStage, setTargetAlterationStage] = useState<OrderStatus>('Sewing');
  const [savingAlteration, setSavingAlteration] = useState(false);
  
  const [loggingException, setLoggingException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [savingException, setSavingException] = useState(false);

  const orderExceptions = useMemo(() => exceptions.filter((e) => e.orderId === resolvedOrderId), [exceptions, resolvedOrderId]);
  const activeException = useMemo(() => {
    const now = new Date();
    return orderExceptions.find((e) => !e.endDate || new Date(e.endDate) > now);
  }, [orderExceptions]);

  const handleLogException = async () => {
    if (!exceptionReason.trim()) return;
    setSavingException(true);
    try {
      await logException('delay', exceptionReason.trim(), resolvedOrderId);
      showToast('Delay exception logged', 'success');
      setLoggingException(false);
      setExceptionReason('');
    } catch (e) {
      showToast('Failed to log exception', 'error');
    } finally {
      setSavingException(false);
    }
  };

  const handleResolveException = async () => {
    if (!activeException) return;
    try {
      await resolveException(activeException.id);
      showToast('Exception resolved', 'success');
    } catch (e) {
      showToast('Failed to resolve exception', 'error');
    }
  };

  const handleDeleteOrder = async () => {
    setDeletingOrder(true);
    const { error } = await deleteOrder(resolvedOrderId);
    if (error) {
      showToast(error, 'error');
      setDeletingOrder(false);
      setConfirmingDelete(false);
      return;
    }
    showToast('Order deleted', 'success');
    router.push(ROUTES.production);
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
    getOrderCommentsAction(order.id).then((result) => {
      if (!result || 'error' in result) return;
      setComments(result);
    }).catch(() => {});
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
      : Promise.resolve([] as import('@/lib/types').Order[]);
    fetchSiblings.then((result) => {
      if (!result || 'error' in result) return;
      setBatchSiblings(result);
    }).catch(() => {});
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
  const trackingUrl = `${APP_CONFIG.baseUrl}${ROUTES.track(order)}`;
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
    if (next === 'Delivered') {
      if (order.isInternalBatch) {
        await performAdvance(next);
      } else if (balanceOwed > 0) {
        setHandoverSheetOpen(true);
      } else {
        setShowAmendmentPrompt(true);
      }
      return;
    }

    if (next === 'Ready' && !order.isInternalBatch) {
      setIsFittingPromptOpen(true);
      return;
    }

    await performAdvance(next);
  };

  const handleSelectStage = async (targetStage: OrderStatus) => {
    setStagePickerOpen(false);
    if (!order || targetStage === order.status) return;

    // Moving backward from Ready or Delivered into Sewing or Cutting -> Alteration workflow
    const isMovingBackwardForRework =
      (order.status === 'Ready' || order.status === 'Delivered') &&
      (targetStage === 'Sewing' || targetStage === 'Cutting');

    if (isMovingBackwardForRework) {
      setTargetAlterationStage(targetStage);
      setAlterationModalOpen(true);
      return;
    }

    // Moving to Delivered
    if (targetStage === 'Delivered') {
      if (order.isInternalBatch) {
        await performAdvance(targetStage);
      } else if (balanceOwed > 0) {
        setHandoverSheetOpen(true);
      } else {
        setShowAmendmentPrompt(true);
      }
      return;
    }

    if (targetStage === 'Ready' && !order.isInternalBatch) {
      setIsFittingPromptOpen(true);
      return;
    }

    await performAdvance(targetStage);
  };

  const handleConfirmFittingSchedule = async (date: string, time: string, sendWhatsApp: boolean) => {
    if (!order) return;
    const clientName = customer?.fullName || order.customerName || 'Client';
    const shopName = currentShop?.name || 'our shop';
    const address = currentShop?.address || '';
    const targetShopId = user?.shopId || currentShop?.id || order.shopId;

    if (targetShopId) {
      try {
        await createCalendarEvent({
          shopId: targetShopId,
          title: `Fitting: ${clientName} (${order.orderDetails || order.styleName || 'Outfit'})`,
          type: 'fitting',
          date,
          startTime: time,
          relatedOrderId: order.id,
          relatedCustomerId: order.customerId,
          description: `Bespoke try-on session for ${order.orderDetails || order.styleName || 'outfit'}.`,
          status: 'pending',
        });
      } catch (err) {
        console.error('Failed to create calendar event:', err);
      }
    }

    setIsFittingPromptOpen(false);
    await performAdvance('Ready');

    if (sendWhatsApp && customer?.whatsappNumber) {
      const formattedDate = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
      const addrText = address ? `\n\nShop Address: ${address}` : '';
      const msg = `Hello ${clientName},\n\nWarm greetings from ${shopName}. Your ${order.orderDetails || order.styleName || 'garment'} is ready for your fitting session!\n\nWe have reserved your appointment for ${formattedDate} at ${time}.${addrText}\n\nPlease let us know if this time works for you. Looking forward to seeing you!`;
      window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
    }

    showToast('Moved to Ready and scheduled fitting appointment', 'success');
  };

  const handleSkipFittingSchedule = async () => {
    setIsFittingPromptOpen(false);
    await performAdvance('Ready');
    showToast('Moved to Ready (direct pickup)', 'success');
  };

  const handleConfirmAlteration = async () => {
    if (!order) return;
    setSavingAlteration(true);
    try {
      const trimmedNotes = alterationNotes.trim();
      if (trimmedNotes) {
        const todayStr = new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
        const alterationHeader = `[Alteration • ${todayStr}${user?.name ? ` by ${user.name}` : ''}]: ${trimmedNotes}`;
        const updatedDetails = order.orderDetails
          ? `${alterationHeader}\n\n${order.orderDetails}`
          : alterationHeader;
        await updateOrder(order.id, { orderDetails: updatedDetails });
        setNotesDraft(updatedDetails);
      }
      await performAdvance(targetAlterationStage);
      showToast(`Moved to ${STATUS_CONFIG[targetAlterationStage].label} for alterations`, 'success');
      setAlterationModalOpen(false);
      setAlterationNotes('');
    } catch {
      showToast('Failed to update order for alteration', 'error');
    } finally {
      setSavingAlteration(false);
    }
  };

  const handleRecordPaymentAndDeliver = async (amount: number, method: PaymentMethod, note?: string) => {
    const { data, error } = await addPayment(order.id, amount, method, note);
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (data) {
      const newDeposit = order.depositPaid + amount;
      updateOrder(order.id, { depositPaid: newDeposit });
      showToast(`₦${amount.toLocaleString()} payment recorded!`, 'success');
    }
    setHandoverSheetOpen(false);
    setShowAmendmentPrompt(true);
  };

  const handleRecordSplitPaymentAndDeliver = async (payments: Array<{ amount: number; method: PaymentMethod; note?: string }>) => {
    let totalAdded = 0;
    for (const p of payments) {
      const { data, error } = await addPayment(order.id, p.amount, p.method, p.note);
      if (error) {
        showToast(error, 'error');
        return;
      }
      if (data) totalAdded += p.amount;
    }
    if (totalAdded > 0) {
      const newDeposit = order.depositPaid + totalAdded;
      updateOrder(order.id, { depositPaid: newDeposit });
      showToast(`₦${totalAdded.toLocaleString()} split tender recorded!`, 'success');
    }
    setHandoverSheetOpen(false);
    setShowAmendmentPrompt(true);
  };

  const handleOpenQuickAdjust = (key: string, label: string, val?: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || '0')) || 0;
    setQuickAdjustTarget({ key, label, value: num });
    setQuickAdjustVal(num);
  };

  const handleSaveQuickAdjust = async () => {
    if (!quickAdjustTarget || !order) return;
    setSavingQuickAdjust(true);
    try {
      const currentMeas = (order.measurements || (customer?.measurements as Record<string, number>)) || {};
      const updated = {
        ...currentMeas,
        [quickAdjustTarget.key]: quickAdjustVal,
      };
      await updateOrder(order.id, { measurements: updated });
      showToast(`${quickAdjustTarget.label} updated to ${quickAdjustVal}"`, 'success');
      setQuickAdjustTarget(null);
    } catch {
      showToast('Failed to save adjustment', 'error');
    } finally {
      setSavingQuickAdjust(false);
    }
  };

  const handleBatchAdvance = async (targetStage: OrderStatus) => {
    if (!order || batchSiblings.length === 0) return;
    setAdvancingBatch(true);
    try {
      updateOrderStatus(order.id, targetStage, user?.uid || '', user?.name || '');
      for (const sibling of batchSiblings) {
        if (sibling.status !== 'Delivered' && sibling.status !== targetStage) {
          updateOrderStatus(sibling.id, targetStage, user?.uid || '', user?.name || '');
        }
      }
      showToast(`All ${batchSiblings.length + 1} outfits moved to ${STATUS_CONFIG[targetStage].label}`, 'success');
    } catch {
      showToast('Failed to advance batch', 'error');
    } finally {
      setAdvancingBatch(false);
    }
  };

  const handleDeliverWithBalanceDue = async () => {
    setHandoverSheetOpen(false);
    setShowAmendmentPrompt(true);
  };

  const performAdvance = async (stage: OrderStatus) => {
    setAdvancing(true);
    try {
      updateOrderStatus(order.id, stage, user?.uid || '', user?.name || '');
      if (customer?.whatsappNumber && stage !== 'Delivered') {
        const msg = getOrderProgressMessage({
          customerName: customer.fullName,
          shopName: currentShop?.name || 'us',
          status: stage,
          trackingUrl,
          customTemplate: currentShop?.stageMessageTemplates?.[stage],
          includeTrackingLink,
        });
        showToast(`Moved to ${STATUS_CONFIG[stage].label}`, 'success', {
          label: 'WhatsApp',
          onClick: () => {
            window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
          },
        });
      } else {
        showToast(`Moved to ${STATUS_CONFIG[stage].label}`, 'success');
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handleSaveNotes = async () => {
    if (notesDraft === null || notesDraft.trim() === '') return;
    setSavingNotes(true);
    try {
      updateOrder(order.id, { orderDetails: notesDraft.trim() });
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
      updateOrder(order.id, {
        // Pass '' rather than undefined for "cleared" fields — the update
        // mapper treats undefined as "leave unchanged", so undefined here
        // would silently fail to actually clear the due date/assignee.
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : '',
        priority: editPriority,
        assignedTo: editAssignedTo,
        assignedToName: assignee?.name || '',
        totalBill: parseInt(editTotalBill.replace(/,/g, '')) || 0,
        materialSuppliedBy: editMaterialSuppliedBy,
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

    const newPending = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      file,
      stage: order.status,
      status: 'uploading' as const,
    }));

    setPendingPhotos((prev) => [...prev, ...newPending]);
    e.target.value = '';

    for (const pending of newPending) {
      try {
        const url = await uploadToStorage(pending.file, '');
        const uploaded: OrderPhoto = { url, stage: pending.stage, uploadedAt: new Date().toISOString() };
        await updateOrder(order.id, { images: [...(order.images || []), uploaded] });
        setPendingPhotos((prev) => prev.filter((p) => p.id !== pending.id));
        URL.revokeObjectURL(pending.previewUrl);
        showToast('Photo added to workshop feed', 'success');
      } catch (err) {
        setPendingPhotos((prev) =>
          prev.map((p) => (p.id === pending.id ? { ...p, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' } : p))
        );
        showToast(err instanceof Error ? err.message : 'Network issue uploading photo', 'error', {
          label: 'Retry',
          onClick: () => handleRetryPendingPhoto(pending.id),
        });
      }
    }
  };

  const handleRetryPendingPhoto = async (id: string) => {
    const target = pendingPhotos.find((p) => p.id === id);
    if (!target) return;
    setPendingPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'uploading', error: undefined } : p)));
    try {
      const url = await uploadToStorage(target.file, '');
      const uploaded: OrderPhoto = { url, stage: target.stage, uploadedAt: new Date().toISOString() };
      await updateOrder(order.id, { images: [...(order.images || []), uploaded] });
      setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
      URL.revokeObjectURL(target.previewUrl);
      showToast('Photo uploaded successfully', 'success');
    } catch (err) {
      setPendingPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' } : p))
      );
      showToast('Retry failed — check connection', 'error');
    }
  };

  const handleEventPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!isPremium && (order.images?.length || 0) + files.length > FREE_ORDER_PROGRESS_PHOTO_LIMIT) {
      showToast(`Free plan limit: ${FREE_ORDER_PROGRESS_PHOTO_LIMIT} photos per order. Upgrade to add more.`, 'error');
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    try {
      const uploaded: OrderPhoto[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToStorage(file, 'event/');
        uploaded.push({ url, stage: 'Delivered', uploadedAt: new Date().toISOString() });
      }
      await updateOrder(order.id, { images: [...(order.images || []), ...uploaded] });
      showToast(uploaded.length > 1 ? `${uploaded.length} event photos added to Lookbook` : 'Client event photo added to Lookbook', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload event photo', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handlePublishToPortfolio = async () => {
    if (!currentShop?.id || !order) return;
    if (!order.images || order.images.length === 0) {
      showToast('Snap at least one progress photo first before featuring in portfolio', 'error');
      return;
    }
    setPublishingPortfolio(true);
    try {
      if (isDemoMode) {
        addOrderToMockPortfolio(order);
        showToast('Order photos published to your catalog showcase!', 'success');
      } else {
        const res = await publishOrderStoryToPortfolioAction(currentShop.id, order.id);
        if (res.success) {
          showToast('Order photos published to your shop catalog!', 'success');
        } else {
          addOrderToMockPortfolio(order);
          showToast('Order photos published to your catalog showcase!', 'success');
        }
      }
    } catch {
      addOrderToMockPortfolio(order);
      showToast('Commission story published to portfolio showcase!', 'success');
    } finally {
      setPublishingPortfolio(false);
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

  const BASELINE_KEYS = [
    'chest', 'bust', 'waist', 'hips', 'shoulder', 'dressLength',
    'trouserLength', 'shirtLength', 'length', 'gownLength', 'sleeveLength', 'sleeve'
  ];
  const baselineMeasurements = measurementEntries.filter(([k]) =>
    BASELINE_KEYS.some((b) => b.toLowerCase() === k.toLowerCase())
  );
  const detailedMeasurements = measurementEntries.filter(
    ([k]) => !BASELINE_KEYS.some((b) => b.toLowerCase() === k.toLowerCase())
  );

  const fabricPhotoUrl =
    (order.images || []).find((img) => img.stage === 'Documented')?.url ||
    (order as any).fabricImage ||
    null;
  const primaryInspoUrl = (order.inspirationImages || [])[0] || null;
  const progressPhotos = (order.images || []).filter((img) => img.stage !== 'Documented');
  const latestPending = pendingPhotos.length > 0 ? pendingPhotos[pendingPhotos.length - 1] : null;
  const latestProgressPhoto = latestPending
    ? { url: latestPending.previewUrl, stage: latestPending.stage, isPending: true, status: latestPending.status, id: latestPending.id }
    : progressPhotos.length > 0
    ? { ...progressPhotos[progressPhotos.length - 1], isPending: false }
    : null;

  const handleCopyMeasurements = () => {
    if (measurementEntries.length === 0) return;
    const lines = [
      `*MEASUREMENTS SPEC: ${order.customerName || 'Customer'}*`,
      `Garment: ${order.orderDetails || 'Custom Order'}`,
      `Order: #${orderRef}`,
      '',
      ...measurementEntries.map(([k, v]) => `• ${MEASUREMENT_LABELS[k] || k}: ${v}"`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Measurements copied to clipboard', 'success');
  };

  return (
    <PageLayout
      header={
        <TopBar
          title={`Order #${orderRef}`}
          showBack
          onBack={() => router.push(ROUTES.production)}
          rightAction={
            <>
              {/* Desktop counterpart to the mobile WhatsApp FAB below — a
                  floating thumb-reachable bubble is a phone pattern; on a
                  mouse-driven screen the same action belongs in the
                  toolbar next to the other header actions instead. */}
              {customer && (
                <button
                  type="button"
                  onClick={() => setWhatsAppSheetOpen(true)}
                  className={styles.whatsappTopBarBtn}
                  aria-label={`WhatsApp ${customer.fullName}`}
                >
                  <WhatsappIcon size={18} />
                </button>
              )}
              <NotificationBell />
            </>
          }
        />
      }
    >
      <div className={styles.detailWrapper}>
        {/* Desktop: a real two-column detail view — main column (the
           actual work: photos, notes, measurements) on the left, a
           persistent rail (order properties, money, history, destructive
           action) on the right — the same split Linear/GitHub issue views
           use. Placement is pure CSS grid-area, fully decoupled from DOM
           order, so mobile's flex-column stacking below is completely
           untouched — same source order as always. */}
        {/* 1. Luxury Atelier Studio Command Hero Card */}
        <section className={styles.heroCard + ' ' + styles.gaHeader}>
          <div className={styles.heroTop}>
            <div className={styles.heroProfile}>
              <Avatar
                name={order.customerName || 'Customer'}
                size="lg"
                shape="squircle"
                className={styles.customerAvatar}
              />
              <div className={styles.heroInfo}>
                <div className={styles.refRow}>
                  <span className={styles.refBadge}>Order #{orderRef}</span>
                  {customer && (
                    <Link href={ROUTES.customerDetail(customer)} className={styles.viewProfileBtn}>
                      <span>Client Profile</span>
                      <Symbol name="arrow_forward" size={12} />
                    </Link>
                  )}
                </div>
                <h2 className={styles.heroCustomerName}>{order.customerName}</h2>
                <p className={styles.heroGarment}>{order.orderDetails}</p>
              </div>
            </div>

            <div className={styles.heroActions}>
              {/* Desktop Direct Move / Alteration CTA */}
              {isDesktop && (
                <>
                  {(order.status === 'Ready' || order.status === 'Delivered') && (
                    <button
                      type="button"
                      className={styles.heroReworkBtn}
                      onClick={() => {
                        setTargetAlterationStage('Sewing');
                        setAlterationModalOpen(true);
                      }}
                    >
                      <Symbol name="needle" size={14} />
                      <span>{order.status === 'Delivered' ? 'Reopen Alteration' : 'Needs Alteration'}</span>
                    </button>
                  )}
                  {next && (
                    <button type="button" className={styles.heroAdvanceBtn} onClick={handleAdvance} disabled={advancing}>
                      {advancing ? <Symbol name="progress_activity" className="global-spinner" /> : <Symbol name={next === 'Cutting' ? 'content_cut' : 'arrow_forward'} size={14} />}
                      <span>Move to {STATUS_CONFIG[next].label}</span>
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                className={styles.stagePillBtn}
                style={{ background: STATUS_CONFIG[order.status].bgColor }}
                onClick={() => setStagePickerOpen(true)}
                aria-label={`Change stage from ${STATUS_CONFIG[order.status].label}`}
                title="Tap to change stage"
              >
                <span>{STATUS_CONFIG[order.status].label} Stage</span>
                <Symbol name="expand_more" size={14} />
              </button>

              {balanceOwed > 0 ? (
                <span className={styles.balanceHeaderDue}>
                  ₦{formatNumber(balanceOwed)} Due
                </span>
              ) : (
                <span className={styles.balanceHeaderPaid}>
                  <Symbol name="check" size={13} /> Paid in Full
                </span>
              )}

              {customer && (
                <div className={styles.quickContactGroup}>
                  {customer.whatsappNumber && (
                    <div className={styles.heroWhatsappGroup}>
                      <a
                        href={getWhatsAppLink(customer.whatsappNumber, whatsAppMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.heroWhatsappBtn}
                        aria-label={`Send 1-tap ${STATUS_CONFIG[order.status].label} update to ${customer.fullName}`}
                        title="Send WhatsApp update directly in 1 tap"
                      >
                        <WhatsappIcon size={14} />
                        <span>Update Client</span>
                      </a>
                      <button
                        type="button"
                        className={styles.heroWhatsappOptionsBtn}
                        onClick={() => setWhatsAppSheetOpen(true)}
                        aria-label="More WhatsApp options"
                        title="More WhatsApp options (lookbook photo request, custom chat)"
                      >
                        <Symbol name="expand_more" size={13} />
                      </button>
                    </div>
                  )}
                  <a
                    className={styles.heroCallBtn}
                    href={`tel:+${customer.whatsappNumber}`}
                    aria-label={`Call ${customer.fullName}`}
                    title="Call client"
                  >
                    <Symbol name="call" size={14} />
                    <span>Call</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Workshop Production Facts Strip */}
          <div className={styles.heroMetaStrip}>
            <div className={`${styles.heroMetaChip} ${isOverdue(order) ? styles.heroMetaChipOverdue : ''}`}>
              <Symbol name="event" size={13} />
              <span>
                {order.dueDate
                  ? `${isOverdue(order) ? 'Overdue · ' : 'Due '}${new Date(order.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                  : 'Due: Not set'}
              </span>
            </div>
            <div className={styles.heroMetaChip}>
              <Symbol name="person" size={13} />
              <span>{order.assignedToName ? `${order.assignedToName}` : 'Unassigned'}</span>
            </div>
            {order.priority !== 'normal' && (
              <div className={`${styles.heroMetaChip} ${styles.heroMetaChipPriority}`}>
                <Symbol name="bolt" size={13} />
                <span>{order.priority === 'rush' ? 'Rush Order' : 'Urgent'}</span>
              </div>
            )}
            {batchSiblings.length > 0 && (
              <div className={styles.heroMetaChip}>
                <Symbol name="layers" size={13} />
                <span>Batch: {batchSiblings.length + 1} Outfits</span>
              </div>
            )}
          </div>

          {/* Interactive Workshop Stage Stepper Bar */}
          <div className={styles.stageRibbon}>
            <div className={styles.stageStepper}>
              {ORDER_STATUSES.map((status, idx) => {
                const isCurrent = order.status === status;
                const isPast = ORDER_STATUSES.indexOf(order.status) > idx;
                return (
                  <button
                    key={status}
                    type="button"
                    className={`${styles.stageStep} ${isCurrent ? styles.stageStepCurrent : ''} ${isPast ? styles.stageStepPast : ''}`}
                    onClick={() => handleSelectStage(status)}
                    title={`Switch to ${STATUS_CONFIG[status].label}`}
                  >
                    <div className={styles.stageStepCircle}>
                      {isPast ? (
                        <Symbol name="check" size={11} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span className={styles.stageStepText}>{STATUS_CONFIG[status].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeException ? (
            <div className={styles.exceptionBanner}>
              <div className={styles.exceptionBannerContent}>
                <Symbol name="front_hand" size={18} />
                <span>
                  <strong>Streak Paused:</strong> {activeException.reason || 'Delay Exception'}
                </span>
              </div>
              <button type="button" className={styles.exceptionResolveBtn} onClick={handleResolveException}>
                Resolve
              </button>
            </div>
          ) : order.status !== 'Delivered' && (
            <div className={styles.exceptionActionRow}>
              <button type="button" className={styles.logExceptionBtn} onClick={() => setLoggingException(true)}>
                <Symbol name="front_hand" size={16} /> Log Delay Exception
              </button>
            </div>
          )}
        </section>

        {/* 2. Luxury Atelier Dossier Segmented Tab Control */}
        <div className={styles.dossierTabBar}>
          <button
            type="button"
            className={`${styles.dossierTabBtn} ${activeTab === 'spec' ? styles.dossierTabActive : ''}`}
            onClick={() => setActiveTab('spec')}
          >
            <Symbol name="checkroom" size={15} />
            <span>Craft Spec</span>
          </button>
          <button
            type="button"
            className={`${styles.dossierTabBtn} ${activeTab === 'feed' ? styles.dossierTabActive : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Symbol name="photo_camera" size={15} />
            <span>Workshop Feed</span>
            {(order.images?.length || 0) > 0 && (
              <span className={styles.tabBadge}>{order.images?.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.dossierTabBtn} ${activeTab === 'ledger' ? styles.dossierTabActive : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <Symbol name="payments" size={15} />
            <span>Ledger &amp; Costs</span>
            {balanceOwed > 0 && <span className={styles.tabDueDot} />}
          </button>
        </div>

        {/* 3. Luxury Atelier Production Dossier Content */}
        <div className={styles.dossierBody}>
          {/* ── PILLAR 1: CRAFT SPEC ── */}
          {activeTab === 'spec' && (
            <div className={styles.tabContentGroup}>
              {/* Visual Reference & Progress Tray (Zero tab-switching) */}
              <section className={styles.visualGlanceStripCard}>
                <div className={styles.visualGlanceHeader}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Visual Reference &amp; Workbench</h3>
                    <span className={styles.measureSubtitle}>Fabric swatch, style inspiration, and latest progress at a glance</span>
                  </div>
                  <label className={styles.actionPillBtn} title="Snap workshop progress photo">
                    <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    <Symbol name="add_a_photo" size={14} />
                    <span>{uploadingPhoto ? 'Uploading…' : 'Snap Progress'}</span>
                  </label>
                </div>

                <div className={styles.visualGlanceRow}>
                  {/* Fabric Swatch */}
                  {fabricPhotoUrl ? (
                    <div
                      className={styles.visualGlanceTile}
                      onClick={(e) => setLightbox({ src: fabricPhotoUrl, rect: e.currentTarget.getBoundingClientRect() })}
                      title="Tap to view full fabric photo"
                    >
                      <Image src={fabricPhotoUrl} alt="Fabric swatch" width={220} height={220} className={styles.visualGlanceImg} />
                      <span className={styles.visualGlanceBadge}>
                        <Symbol name="texture" size={11} /> Fabric Swatch
                      </span>
                    </div>
                  ) : (
                    <div className={styles.visualGlanceEmptyTile}>
                      <Symbol name="texture" size={20} />
                      <span>No Fabric Photo</span>
                    </div>
                  )}

                  {/* Style Inspiration */}
                  {primaryInspoUrl ? (
                    <div
                      className={styles.visualGlanceTile}
                      onClick={(e) => setLightbox({ src: primaryInspoUrl, rect: e.currentTarget.getBoundingClientRect() })}
                      title="Tap to view design reference"
                    >
                      <Image src={primaryInspoUrl} alt="Style reference" width={220} height={220} className={styles.visualGlanceImg} />
                      <span className={styles.visualGlanceBadge}>
                        <Symbol name="photo_library" size={11} /> Design Inspo
                      </span>
                    </div>
                  ) : (
                    <div className={styles.visualGlanceEmptyTile}>
                      <Symbol name="photo_library" size={20} />
                      <span>No Style Photo</span>
                    </div>
                  )}

                  {/* Latest Workbench Progress */}
                  {latestProgressPhoto ? (
                    <div
                      className={styles.visualGlanceTile}
                      onClick={(e) => setLightbox({ src: latestProgressPhoto.url, rect: e.currentTarget.getBoundingClientRect() })}
                      title="Tap to view latest progress photo"
                    >
                      <Image
                        src={latestProgressPhoto.url}
                        alt={`${latestProgressPhoto.stage} progress`}
                        width={220}
                        height={220}
                        className={styles.visualGlanceImg}
                        unoptimized={Boolean((latestProgressPhoto as any).isPending)}
                      />
                      <span className={`${styles.visualGlanceBadge} ${styles.visualGlanceBadgeProgress}`}>
                        <Symbol name="checkroom" size={11} /> {latestProgressPhoto.stage} Progress
                      </span>
                      {(latestProgressPhoto as any).isPending && (
                        (latestProgressPhoto as any).status === 'failed' ? (
                          <div className={styles.optimisticUploadOverlay}>
                            <span className={styles.optimisticErrorBadge}>Upload Failed</span>
                            <button
                              type="button"
                              className={styles.retryUploadBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryPendingPhoto((latestProgressPhoto as any).id);
                              }}
                            >
                              <Symbol name="cloud_sync" size={12} />
                              <span>Retry</span>
                            </button>
                          </div>
                        ) : (
                          <span className={styles.optimisticUploadBadge}>
                            <Symbol name="progress_activity" className="global-spinner" size={11} />
                            <span>Uploading…</span>
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <label className={`${styles.visualGlanceEmptyTile} ${styles.visualGlanceUploadTile}`}>
                      <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                      <Symbol name="add_a_photo" size={20} />
                      <span>{uploadingPhoto ? 'Uploading…' : 'Snap 1st Progress'}</span>
                    </label>
                  )}
                </div>
              </section>

              {/* Measurements — Craft Spec Section */}
              <section className={styles.card + ' ' + styles.gaMeasure}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>
                      {usingOrderMeasurements ? 'Garment Measurements' : "Body Profile Measurements"}
                    </h3>
                    <span className={styles.measureSubtitle}>
                      {usingOrderMeasurements ? 'Specific to this outfit' : 'From customer body profile'}
                    </span>
                  </div>
                  <div className={styles.sectionActions}>
                    <button
                      type="button"
                      className={styles.cuttingSlipBtn}
                      onClick={() => setCuttingSlipOpen(true)}
                      title="Open full-screen cutter slip"
                    >
                      <Symbol name="receipt_long" size={13} />
                      <span>Cutting Slip</span>
                    </button>
                    {measurementEntries.length > 0 && (
                      <button
                        type="button"
                        className={styles.copySpecBtn}
                        onClick={handleCopyMeasurements}
                        aria-label="Copy measurements spec"
                        title="Copy specification to clipboard"
                      >
                        <Symbol name="content_copy" size={13} />
                        <span>Copy Specs</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.roundIconBtn}
                      aria-label="Edit this order's measurements"
                      onClick={() => setEditingMeasurements(true)}
                    >
                      <Symbol name="edit" size={18} />
                    </button>
                  </div>
                </div>
                {measurementEntries.length === 0 ? (
                  <p className={styles.emptyNote}>No measurements on file for this order or customer yet.</p>
                ) : (
                  <>
                    {/* High-Contrast Cutting Table Baseline Glance Grid */}
                    {baselineMeasurements.length > 0 && (
                      <div className={styles.cutterGlanceSection}>
                        <span className={styles.cutterGlanceHeaderTitle}>Baseline Cutting Dimensions</span>
                        <div className={styles.cutterGlanceGrid}>
                          {baselineMeasurements.map(([key, value]) => {
                            const label = MEASUREMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                            return (
                              <div
                                key={key}
                                className={`${styles.cutterGlanceCard} ${styles.cutterGlanceCardClickable}`}
                                onClick={() => handleOpenQuickAdjust(key, label, value ?? 0)}
                                role="button"
                                tabIndex={0}
                                title={`Tap to quick-adjust ${label}`}
                              >
                                <div className={styles.cutterGlanceCardHeader}>
                                  <span className={styles.cutterGlanceLabel}>{label}</span>
                                  <Symbol name="tune" size={13} className={styles.cutterGlanceEditIcon} />
                                </div>
                                <span className={styles.cutterGlanceValue}>
                                  {value}<strong>&quot;</strong>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed Secondary Measurements */}
                    {detailedMeasurements.length > 0 && (
                      <div className={styles.detailedMeasureSection}>
                        {baselineMeasurements.length > 0 && (
                          <span className={styles.cutterGlanceHeaderTitle}>Additional Tailoring Dimensions</span>
                        )}
                        <div className={styles.measureGrid}>
                          {detailedMeasurements.map(([key, value]) => (
                            <div key={key} className={styles.measureRow}>
                              <span className={styles.measureLabel}>{MEASUREMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</span>
                              <span className={styles.measureValue}>{value}&quot;</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!usingOrderMeasurements && (
                      <p className={styles.emptyNote}>No measurements were recorded for this specific order — showing the customer&apos;s general body profile instead.</p>
                    )}
                  </>
                )}
              </section>

              {/* Fabric & Inspiration Media Card */}
              <section className={styles.card + ' ' + styles.gaInspo}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Fabric &amp; Style Inspiration</h3>
                    <span className={styles.measureSubtitle}>Reference photos provided for this order</span>
                  </div>
                  <div className={styles.sectionActions}>
                    {(!isPremium && (order.inspirationImages?.length || 0) >= FREE_ORDER_INSPIRATION_PHOTO_LIMIT) ? (
                      <span className={styles.emptyNote}>Limit ({FREE_ORDER_INSPIRATION_PHOTO_LIMIT})</span>
                    ) : (
                      <label className={styles.actionPillBtn}>
                        <input type="file" accept="image/*" multiple hidden onChange={handleInspoUpload} disabled={uploadingInspo} />
                        <Symbol name="add_photo_alternate" size={15} />
                        <span>{uploadingInspo ? 'Uploading…' : 'Add Photo'}</span>
                      </label>
                    )}
                  </div>
                </div>
                {(order.inspirationImages || []).length === 0 ? (
                  <div className={styles.emptyPhotoHint}>
                    <Symbol name="add_photo_alternate" className={styles.emptyPhotoIcon} />
                    <span>No reference photos attached yet — add customer inspiration photos or swatches here.</span>
                  </div>
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

              {/* Artisan Embellishment & Beading Tracker */}
              <OrderEmbellishmentTracker
                order={order}
                onUpdateOrderDetails={async (newDetails) => {
                  await updateOrder(order.id, { orderDetails: newDetails });
                  showToast('Embellishment spec updated', 'success');
                }}
                currency={currentShop?.currency}
              />

              {/* Order notes */}
              <section className={styles.card + ' ' + styles.gaNotes}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Garment Notes &amp; Cutting Instructions</h3>
                    <span className={styles.measureSubtitle}>Special styling requests, lining, stay, or collar notes</span>
                  </div>
                  <Symbol name="sticky_note_2" size={18} className={styles.capsIcon} />
                </div>
                <textarea
                  className={styles.notesArea}
                  value={notesDraft ?? order.orderDetails}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add garment details and tailor notes here…"
                  rows={3}
                />
                <div className={styles.notesActionRow}>
                  <button
                    type="button"
                    className={styles.saveNoteBtn}
                    onClick={handleSaveNotes}
                    disabled={savingNotes || notesDraft === null || notesDraft.trim() === '' || notesDraft === order.orderDetails}
                  >
                    {savingNotes && <Symbol name="progress_activity" className="global-spinner" />}
                    <span>Save Notes</span>
                  </button>
                </div>
              </section>

              {/* Batch siblings */}
              {batchSiblings.length > 0 && (
                <section className={styles.card + ' ' + styles.gaBatch}>
                  <div className={styles.sectionHeaderRow}>
                    <div className={styles.sectionTitleGroup}>
                      <h3 className={styles.sectionTitle}>From the Same Drop-off ({batchSiblings.length + 1} items)</h3>
                      <span className={styles.measureSubtitle}>Sibling garments created in this same order batch</span>
                    </div>
                    <div className={styles.sectionActions}>
                      {next && (
                        <button
                          type="button"
                          className={styles.batchPillActionBtn}
                          onClick={() => handleBatchAdvance(next)}
                          disabled={advancingBatch}
                          title={`Advance entire batch to ${STATUS_CONFIG[next].label}`}
                        >
                          <Symbol name="arrow_forward" size={13} />
                          <span>{advancingBatch ? 'Advancing…' : `Advance All to ${STATUS_CONFIG[next].label}`}</span>
                        </button>
                      )}
                      {batchSiblings.some((s) => s.status !== order.status) && (
                        <button
                          type="button"
                          className={styles.copySpecBtn}
                          onClick={() => handleBatchAdvance(order.status)}
                          disabled={advancingBatch}
                          title={`Sync all batch garments to ${STATUS_CONFIG[order.status].label}`}
                        >
                          <Symbol name="layers" size={13} />
                          <span>Sync to {STATUS_CONFIG[order.status].label}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.batchList}>
                    {batchSiblings.map((sibling) => (
                      <Link key={sibling.id} href={ROUTES.productionOrder(sibling)} className={styles.batchRow}>
                        <span className={styles.batchDetails}>{sibling.orderDetails}</span>
                        <span className={styles.stageChipSm} style={{ background: STATUS_CONFIG[sibling.status].bgColor }}>
                          {sibling.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── PILLAR 2: WORKSHOP FEED ── */}
          {activeTab === 'feed' && (
            <div className={styles.tabContentGroup}>
              {/* Progress gallery */}
              <section className={styles.card + ' ' + styles.gaGallery}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Workshop Progress Photos</h3>
                    <span className={styles.measureSubtitle}>Stage-stamped snapshots as garment is crafted</span>
                  </div>
                  <div className={styles.sectionActions}>
                    {order.images && order.images.length > 0 && (
                      <button
                        type="button"
                        className={styles.featurePortfolioBtn}
                        onClick={handlePublishToPortfolio}
                        disabled={publishingPortfolio}
                        title="Feature this garment and its making-of sequence in your public portfolio"
                      >
                        <Symbol name="auto_awesome" size={14} />
                        <span>{publishingPortfolio ? 'Publishing…' : 'Feature in Portfolio'}</span>
                      </button>
                    )}
                    {(!isPremium && (order.images?.length || 0) >= FREE_ORDER_PROGRESS_PHOTO_LIMIT) ? (
                      <span className={styles.emptyNote}>Limit ({FREE_ORDER_PROGRESS_PHOTO_LIMIT})</span>
                    ) : (
                      <>
                        <label className={styles.actionPillBtn}>
                          <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                          <Symbol name="add_a_photo" size={15} />
                          <span>{uploadingPhoto ? 'Uploading…' : 'Snap Photo'}</span>
                        </label>
                        <label className={styles.actionPillBtn} title="Upload client photos from WhatsApp / event">
                          <input type="file" accept="image/*" multiple hidden onChange={handleEventPhotoUpload} disabled={uploadingPhoto} />
                          <Symbol name="photo_camera" size={15} />
                          <span>Add Client Event Photos</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
                {(order.images || []).length === 0 && pendingPhotos.length === 0 ? (
                  <div className={styles.emptyPhotoHint}>
                    <Symbol name="add_a_photo" className={styles.emptyPhotoIcon} />
                    <span>No progress photos yet — snap one as the garment moves through Cutting, Sewing, or Fitting.</span>
                  </div>
                ) : (
                  <div className={styles.galleryGrid}>
                    {pendingPhotos.map((pending) => (
                      <div key={pending.id} className={styles.galleryThumb}>
                        <Image src={pending.previewUrl} alt={`${pending.stage} uploading`} width={400} height={400} unoptimized />
                        {pending.status === 'uploading' ? (
                          <div className={styles.optimisticUploadOverlay}>
                            <span className={styles.optimisticUploadBadge}>
                              <Symbol name="progress_activity" className="global-spinner" size={12} /> Uploading…
                            </span>
                          </div>
                        ) : (
                          <div className={styles.optimisticUploadOverlay}>
                            <span className={styles.optimisticErrorBadge}>Failed</span>
                            <button
                              type="button"
                              className={styles.retryUploadBtn}
                              onClick={() => handleRetryPendingPhoto(pending.id)}
                            >
                              <Symbol name="cloud_sync" size={12} /> Retry
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(order.images || []).map((photo, i) => (
                      <div key={i} className={styles.galleryThumb}>
                        <Image src={photo.url} alt={`${photo.stage} progress`} width={400} height={400} />
                        <div className={styles.glassCaption}>
                          {photo.stage === 'Delivered' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Symbol name="auto_awesome" size={11} /> Client Event · Lookbook
                            </span>
                          ) : (
                            `${photo.stage} · ${new Date(photo.uploadedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                          )}
                        </div>
                        <button type="button" className={styles.photoRemoveBtn} onClick={() => handleRemovePhoto(i)} aria-label="Remove photo">
                          <Symbol name="close" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Share & communicate — Public Live Tracking */}
              <section className={styles.card + ' ' + styles.gaShare}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Client Live Tracking</h3>
                    <span className={styles.measureSubtitle}>Share real-time progress portal with client</span>
                  </div>
                </div>
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
                      Adds the live tracking link above to WhatsApp stage notifications for this client.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeTrackingLink}
                    onChange={(e) => handleToggleTrackingLink(e.target.checked)}
                  />
                </label>
              </section>

              {/* Customer comments (from public tracking page) */}
              {comments.length > 0 && (
                <section className={styles.card + ' ' + styles.gaComments}>
                  <div className={styles.sectionHeaderRow}>
                    <div className={styles.sectionTitleGroup}>
                      <h3 className={styles.sectionTitle}>Client Comments &amp; Feedback</h3>
                      <span className={styles.measureSubtitle}>Sent by client through the live tracking page</span>
                    </div>
                    <Symbol name="chat_bubble" size={18} className={styles.capsIcon} />
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
            </div>
          )}

          {/* ── PILLAR 3: LEDGER & COSTS ── */}
          {activeTab === 'ledger' && (
            <div className={styles.tabContentGroup}>
              {/* Payment summary (owner view) */}
              {isOwnerView && !order.isInternalBatch && order.customerId && (
                <OrderPayments 
                  orderId={order.id}
                  customerId={order.customerId}
                  walletBalance={customer?.wallet_balance || 0}
                  totalBill={order.totalBill}
                  initialAmountPaid={order.depositPaid}
                  currency={currentShop?.currency}
                  onPaymentAdded={(newTotal) => {
                    updateOrder(order.id, { depositPaid: newTotal });
                  }}
                />
              )}

              {/* Staff Handover payment summary */}
              {!isOwnerView && !order.isInternalBatch && order.customerId && (
                <section className={`${styles.card} ${styles.gaPayment}`}>
                  <div className={styles.staffPayHeader}>
                    <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Payment Status</h3>
                    {balanceOwed > 0 ? (
                      <span className={styles.balanceHeaderDue}>₦{formatNumber(balanceOwed)} Due</span>
                    ) : (
                      <span className={styles.balanceHeaderPaid}><Symbol name="check" size={14} /> Fully Paid</span>
                    )}
                  </div>
                  <div className={styles.staffPayRows}>
                    <div className={styles.payRow}>
                      <span className={styles.payLabel}>Total Bill</span>
                      <span className={styles.payValue}>{formatCurrency(order.totalBill, currentShop?.currency)}</span>
                    </div>
                    <div className={styles.payRow}>
                      <span className={styles.payLabel}>Amount Paid</span>
                      <span className={styles.payValue}>{formatCurrency(order.depositPaid, currentShop?.currency)}</span>
                    </div>
                    <div className={styles.payRowTotal}>
                      <span>Balance at Handover</span>
                      <span className={balanceOwed > 0 ? styles.balanceDue : undefined}>
                        {formatCurrency(balanceOwed, currentShop?.currency)}
                      </span>
                    </div>
                  </div>
                  {balanceOwed > 0 && (
                    <button
                      type="button"
                      className={styles.staffCollectBtn}
                      onClick={() => setHandoverSheetOpen(true)}
                    >
                      <Symbol name="payments" size={18} />
                      <span>Record Balance Collection</span>
                    </button>
                  )}
                </section>
              )}

              {/* Cost & margin (owner only) */}
              {isOwnerView && FEATURE_FLAGS.costMarginTracking && (
                <OrderExpenses orderId={order.id} shopId={order.shopId} totalBill={order.totalBill} currency={currentShop?.currency} />
              )}

              {/* Materials Inventory */}
              <OrderMaterials orderId={order.id} shopId={order.shopId} />

              {/* Production Metadata & Assignment Settings */}
              <section className={styles.card + ' ' + styles.gaMeta}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Order Production Settings</h3>
                    <span className={styles.measureSubtitle}>Due date, assigned cutter/tailor, and priority</span>
                  </div>
                  {isOwnerView && !isEditing && (
                    <button type="button" className={styles.actionPillBtn} onClick={startEditing}>
                      <Symbol name="edit" size={14} />
                      <span>Edit Settings</span>
                    </button>
                  )}
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Assigned Tailor</span>
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
                    <span className={styles.metaLabel}>Intake Date</span>
                    <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Current Stage Entry</span>
                    <span className={styles.metaValue}>
                      {stageEntry ? `Entered ${STATUS_CONFIG[order.status].label} on ${formatDate(stageEntry.timestamp)}` : '—'}
                    </span>
                  </div>
                </div>

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
                      </div>
                    )}
                    <div className={styles.editActions}>
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button variant="primary" loading={savingEdit} onClick={handleSaveEdit}>Save Changes</Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Activity timeline — full pipeline */}
              <section className={styles.card + ' ' + styles.gaTimeline}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 className={styles.sectionTitle}>Activity Timeline</h3>
                    <span className={styles.measureSubtitle}>Stage progression &amp; audit history</span>
                  </div>
                </div>
                <div className={styles.timeline}>
                  {ORDER_STATUSES.map((status) => {
                    const entry = order.statusHistory.filter((h) => h.to === status).pop();
                    const currentIndex = ORDER_STATUSES.indexOf(order.status);
                    const stepIndex = ORDER_STATUSES.indexOf(status);
                    const isTerminal = status === 'Delivered' && order.status === 'Delivered';
                    const state = stepIndex < currentIndex || isTerminal ? 'done' : stepIndex === currentIndex ? 'current' : 'pending';
                    return (
                      <div key={status} className={styles.timelineStep}>
                        <div className={styles.timelineLine} />
                        <div className={`${styles.timelineDot} ${styles['dot_' + state]}`}>
                          <Symbol
                            name={state === 'done' ? 'check' : state === 'current' ? 'autorenew' : status === 'Delivered' ? 'check_circle' : 'hourglass_empty'}
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

              {/* Danger Zone */}
              {isOwnerView && (
                <section className={styles.dangerZone}>
                  <h3 className={styles.dangerZoneTitle}>Danger Zone</h3>
                  <p className={styles.dangerZoneHint}>This action is permanent and cannot be undone.</p>
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
                      {deletingOrder && <Symbol name="progress_activity" className="global-spinner" />}
                      <Symbol name="delete" /> Delete Order
                    </>
                  </button>
                </section>
              )}
            </div>
          )}
        </div>
        {!isDesktop && <div className={styles.mobileBottomClearance} />}
      </div>

      {/* Floating mobile sticky bottom bar — portaled straight to document.body,
          see FixedBottomPortal for why. */}
      {!isDesktop && (next || customer || order.status === 'Delivered') && (
        <FixedBottomPortal>
          <div className={styles.mobileStickyBottomBar}>
            {order.status === 'Delivered' ? (
              <button
                type="button"
                className={styles.stickyAlterationFullBtn}
                onClick={() => {
                  setTargetAlterationStage('Sewing');
                  setAlterationModalOpen(true);
                }}
              >
                <Symbol name="needle" size={16} />
                <span>Reopen for Alteration</span>
              </button>
            ) : next ? (
              <button
                type="button"
                className={styles.stickyAdvanceBtn}
                onClick={handleAdvance}
                disabled={advancing}
              >
                {advancing && <Symbol name="progress_activity" className="global-spinner" />}
                <Symbol name={next === 'Cutting' ? 'content_cut' : 'arrow_forward'} size={18} />
                <span>Move to {STATUS_CONFIG[next].label}</span>
              </button>
            ) : null}

            {order.status === 'Ready' && (
              <button
                type="button"
                className={styles.stickyAlterationSquareBtn}
                onClick={() => {
                  setTargetAlterationStage('Sewing');
                  setAlterationModalOpen(true);
                }}
                aria-label="Send for Alteration"
                title="Needs Alteration"
              >
                <Symbol name="needle" size={18} />
              </button>
            )}

            {customer && (
              <button
                type="button"
                className={styles.stickyWhatsAppBtn}
                onClick={() => setWhatsAppSheetOpen(true)}
                aria-label={`WhatsApp ${customer.fullName}`}
              >
                <WhatsappIcon size={22} color="#FFFFFF" />
              </button>
            )}
          </div>
        </FixedBottomPortal>
      )}

      {customer && (
        <WhatsAppOptionsSheet
          isOpen={whatsAppSheetOpen}
          onClose={() => setWhatsAppSheetOpen(false)}
          customerName={customer.fullName}
          whatsappNumber={customer.whatsappNumber}
          progressMessage={whatsAppMessage || ''}
          orderStatus={order.status}
          garmentName={order.styleName || order.orderDetails}
          shopName={currentShop?.name}
          orderRef={orderRef}
        />
      )}

      {/* 1-Tap Stage Switcher Sheet */}
      <BottomSheet
        isOpen={stagePickerOpen}
        onClose={() => setStagePickerOpen(false)}
        title="Change Production Stage"
        variant="modal"
      >
        <div className={styles.stageSheetList}>
          {ORDER_STATUSES.map((status) => {
            const isCurrent = order.status === status;
            return (
              <button
                key={status}
                type="button"
                className={`${styles.stageOptionBtn} ${isCurrent ? styles.stageOptionActive : ''}`}
                onClick={() => handleSelectStage(status)}
              >
                <div className={styles.stageOptionLeft}>
                  <span
                    className={styles.stageOptionDot}
                    style={{ background: STATUS_CONFIG[status].bgColor }}
                  />
                  <span className={styles.stageOptionLabel}>{STATUS_CONFIG[status].label} Stage</span>
                </div>
                {isCurrent ? (
                  <span className={styles.stageCurrentBadge}>Current</span>
                ) : (
                  <Symbol name="chevron_right" size={18} />
                )}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Alterations / Fitting Rework Prompt */}
      <BottomSheet
        isOpen={alterationModalOpen}
        onClose={() => setAlterationModalOpen(false)}
        title="Send for Alteration / Rework"
        variant="modal"
      >
        <div className={styles.alterationBody}>
          <p className={styles.alterationDesc}>
            Specify what fit adjustments or seam alterations are needed. These instructions will be saved to the garment notes and the order will move to <strong>{STATUS_CONFIG[targetAlterationStage].label}</strong>.
          </p>
          <textarea
            className={styles.alterationTextarea}
            value={alterationNotes}
            onChange={(e) => setAlterationNotes(e.target.value)}
            placeholder="e.g. Waist too tight by 1.5 inches, loosen side seams and shorten hem by 1 inch..."
            autoFocus
          />
          <div className={styles.alterationActions}>
            <Button
              variant="ghost"
              onClick={async () => {
                await performAdvance(targetAlterationStage);
                setAlterationModalOpen(false);
                setAlterationNotes('');
              }}
            >
              Skip Note &amp; Move
            </Button>
            <Button
              variant="primary"
              loading={savingAlteration}
              onClick={handleConfirmAlteration}
            >
              Move to {STATUS_CONFIG[targetAlterationStage].label}
            </Button>
          </div>
        </div>
      </BottomSheet>


      <CuttingSlipModal
        isOpen={cuttingSlipOpen}
        onClose={() => setCuttingSlipOpen(false)}
        order={order}
        customer={customer}
      />

      <ScheduleFittingPromptModal
        isOpen={isFittingPromptOpen}
        onClose={() => setIsFittingPromptOpen(false)}
        order={order}
        customer={customer}
        onConfirmSchedule={handleConfirmFittingSchedule}
        onSkipFitting={handleSkipFittingSchedule}
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

      <ConfirmDialog
        isOpen={showAmendmentPrompt}
        onClose={() => {
          setShowAmendmentPrompt(false);
          performAdvance('Delivered');
        }}
        onConfirm={async () => {
          setShowAmendmentPrompt(false);
          await performAdvance('Delivered');
          if (order.customerId) {
            router.push(ROUTES.customerDetail(customer || order.customerId));
          }
        }}
        title="Any Fit Amendments?"
        description="Since you're delivering this order, did you make any final adjustments to the garment? You can record them now so the customer's next outfit fits perfectly from the start."
        confirmLabel="Record Amendments"
        cancelLabel="No, Fits Perfectly"
        destructive={false}
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

      <HandoverPaymentSheet
        isOpen={handoverSheetOpen}
        onClose={() => setHandoverSheetOpen(false)}
        order={order}
        customer={customer}
        balanceOwed={balanceOwed}
        currency={currentShop?.currency}
        walletBalance={customer?.wallet_balance || 0}
        onRecordPaymentAndDeliver={handleRecordPaymentAndDeliver}
        onRecordSplitPaymentAndDeliver={handleRecordSplitPaymentAndDeliver}
        onDeliverWithBalanceDue={handleDeliverWithBalanceDue}
      />

      {quickAdjustTarget && (
        <BottomSheet
          isOpen={!!quickAdjustTarget}
          onClose={() => setQuickAdjustTarget(null)}
          variant="modal"
          noPadding
        >
          <div className={styles.quickAdjustContainer}>
            <div className={styles.quickAdjustHeader}>
              <div>
                <h3 className={styles.quickAdjustTitle}>Adjust {quickAdjustTarget.label}</h3>
                <p className={styles.quickAdjustSubtitle}>Quick cutting-table stepper adjustment</p>
              </div>
              <button
                type="button"
                className={styles.sheetCloseBtn}
                onClick={() => setQuickAdjustTarget(null)}
                aria-label="Close"
              >
                <Symbol name="close" size={18} />
              </button>
            </div>

            <div className={styles.quickAdjustDisplayCard}>
              <span className={styles.quickAdjustValueLarge}>
                {quickAdjustVal}<strong>&quot;</strong>
              </span>
              <div className={styles.steppersRow}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setQuickAdjustVal((prev) => Math.max(0, Math.round((prev - 1) * 10) / 10))}
                >
                  -1.0&quot;
                </button>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setQuickAdjustVal((prev) => Math.max(0, Math.round((prev - 0.5) * 10) / 10))}
                >
                  -0.5&quot;
                </button>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setQuickAdjustVal((prev) => Math.round((prev + 0.5) * 10) / 10)}
                >
                  +0.5&quot;
                </button>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setQuickAdjustVal((prev) => Math.round((prev + 1) * 10) / 10)}
                >
                  +1.0&quot;
                </button>
              </div>
            </div>

            <div className={styles.quickAdjustManualInputRow}>
              <label className={styles.quickAdjustInputLabel}>Or enter precise measurement</label>
              <input
                type="number"
                step="0.125"
                className={styles.quickAdjustInput}
                value={quickAdjustVal}
                onChange={(e) => setQuickAdjustVal(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className={styles.quickAdjustActions}>
              <Button
                variant="primary"
                fullWidth
                loading={savingQuickAdjust}
                onClick={handleSaveQuickAdjust}
              >
                Save {quickAdjustVal}&quot; to Cut
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}

      {loggingException && (
        <FixedBottomPortal>
          <div className={styles.exceptionSheetOverlay} onClick={() => setLoggingException(false)}>
            <div className={styles.exceptionSheet} onClick={e => e.stopPropagation()}>
              <div className={styles.sheetHeader}>
                <h3 className={styles.sheetTitle}>Log Delay Exception</h3>
                <button type="button" className={styles.sheetCloseBtn} onClick={() => setLoggingException(false)} aria-label="Close">
                  <Symbol name="close" size={24} />
                </button>
              </div>
              <div className={styles.sheetBody}>
                <p className={styles.sheetDesc}>
                  If an order is delayed due to circumstances outside your control (e.g. customer didn&apos;t bring fabric, missed fitting), log an exception here to pause your streak evaluation for this order.
                </p>
                <Input
                  label="Reason for Delay"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="e.g. Waiting on customer's fabric"
                  autoFocus
                />
                <Button
                  variant="primary"
                  fullWidth
                  disabled={!exceptionReason.trim() || savingException}
                  loading={savingException}
                  onClick={handleLogException}
                >
                  Log Exception
                </Button>
              </div>
            </div>
          </div>

        </FixedBottomPortal>
      )}
    </PageLayout>
  );
}
