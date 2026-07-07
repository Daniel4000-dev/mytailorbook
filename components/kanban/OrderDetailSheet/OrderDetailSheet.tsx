'use client';

import { useState } from 'react';
import {
  FaUser,
  FaCalendarDays,
  FaClock,
  FaRegCommentDots,
  FaLink,
  FaWhatsapp,
  FaCreditCard,
  FaTimeline,
  FaCircleCheck,
  FaScissors,
  FaPen,
  FaPrint,
  FaCamera,
  FaXmark,
  FaTriangleExclamation,
  FaFireFlameCurved,
  FaBolt,
} from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Select from '@/components/ui/Select/Select';
import ActivityTimeline from '@/components/kanban/ActivityTimeline/ActivityTimeline';
import { formatCurrency, formatDate, getWhatsAppLink, getOrderProgressMessage } from '@/lib/formatters';
import { getBalanceOwed, isOverdue } from '@/lib/types';
import type { Order, Role, Customer, Priority } from '@/lib/types';
import styles from './OrderDetailSheet.module.css';

interface OrderDetailSheetProps {
  order: Order;
  customer: Customer | null;
  userRole: Role;
  onUpdatePayment: (orderId: string, amount: number, note?: string) => Promise<void>;
}

export default function OrderDetailSheet({ order, customer, userRole, onUpdatePayment }: OrderDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [startingProd, setStartingProd] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editDetails, setEditDetails] = useState(order.orderDetails);
  const [editDueDate, setEditDueDate] = useState(order.dueDate ? order.dueDate.slice(0, 10) : '');
  const [editPriority, setEditPriority] = useState<Priority>(order.priority);
  const [editAssignedTo, setEditAssignedTo] = useState(order.assignedTo || '');
  const [editTotalBill, setEditTotalBill] = useState(String(order.totalBill));
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { user } = useAuth();
  const { updateOrderStatus, updateOrder, staffMembers, currentShop } = useData();
  const { showToast } = useToast();

  const trackingUrl = `${window.location.origin}/track/${order.id}`;

  const whatsAppMessage = customer
    ? getOrderProgressMessage({
        customerName: customer.fullName,
        shopName: currentShop?.name || 'us',
        status: order.status,
        trackingUrl,
      })
    : undefined;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const balanceOwed = getBalanceOwed(order);

  const handleRecordPayment = async (amount: number) => {
    if (amount <= 0) return;
    setRecordingPayment(true);
    try {
      await onUpdatePayment(order.id, amount);
      setPaymentAmount('');
      showToast(`Payment of ${formatCurrency(amount)} recorded`, 'success');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleStartProduction = async () => {
    setStartingProd(true);
    try {
      await updateOrderStatus(order.id, 'Cutting', user?.uid || '', user?.name || '');
      showToast('Order sent to production', 'success');
    } finally {
      setStartingProd(false);
    }
  };

  const staffOptions = [
    { value: '', label: 'Unassigned' },
    ...staffMembers
      .filter((s) => s.active !== false || s.uid === order.assignedTo)
      .map((s) => ({ value: s.uid, label: s.uid === user?.uid ? `${s.name} (You)` : s.name })),
  ];

  const priorityOptions: { value: Priority; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: '⚡ Urgent' },
    { value: 'rush', label: '🔥 Rush' },
  ];

  const startEditing = () => {
    setEditDetails(order.orderDetails);
    setEditDueDate(order.dueDate ? order.dueDate.slice(0, 10) : '');
    setEditPriority(order.priority);
    setEditAssignedTo(order.assignedTo || '');
    setEditTotalBill(String(order.totalBill));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const assignee = staffMembers.find((s) => s.uid === editAssignedTo);
      const updates: Partial<Order> =
        userRole === 'Owner'
          ? {
              orderDetails: editDetails,
              // Pass '' rather than undefined for "cleared" fields — the update
              // mapper treats undefined as "leave unchanged", so undefined here
              // would silently fail to actually clear the due date/assignee.
              dueDate: editDueDate ? new Date(editDueDate).toISOString() : '',
              priority: editPriority,
              assignedTo: editAssignedTo,
              assignedToName: assignee?.name || '',
              totalBill: parseInt(editTotalBill.replace(/,/g, '')) || 0,
            }
          : { orderDetails: editDetails };
      await updateOrder(order.id, updates);
      setIsEditing(false);
      showToast('Order updated', 'success');
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      // Uploaded straight to Supabase Storage from the browser — bypassing
      // the Next.js Server Action that `updateOrder` goes through, which
      // caps request bodies at 1MB by default. A real phone photo, base64-
      // encoded, almost always exceeded that, so uploads used to silently
      // fail. Only the resulting (short) public URL gets saved to the order.
      const supabase = createClient();
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${order.shopId}/${order.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        const { data } = supabase.storage.from('order-photos').getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
      await updateOrder(order.id, { images: [...(order.images || []), ...uploadedUrls] });
      showToast(uploadedUrls.length > 1 ? `${uploadedUrls.length} photos added` : 'Photo added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const removedUrl = (order.images || [])[index];
    const next = (order.images || []).filter((_, i) => i !== index);
    await updateOrder(order.id, { images: next });

    const marker = '/order-photos/';
    const markerIndex = removedUrl?.indexOf(marker) ?? -1;
    if (markerIndex !== -1) {
      const path = removedUrl.slice(markerIndex + marker.length);
      const supabase = createClient();
      await supabase.storage.from('order-photos').remove([path]);
    }
  };

  return (
    <div className={styles.orderDetail}>
      {/* Send to Production Button (for Documented orders) */}
      {order.status === 'Documented' && (
        <div style={{ marginBottom: '16px' }}>
          <Button
            variant="primary"
            fullWidth
            loading={startingProd}
            onClick={handleStartProduction}
            icon={<FaScissors />}
          >
            Send to Production (Cutting)
          </Button>
        </div>
      )}

      {/* Overview Card */}
      <div className={styles.premiumCard}>
        <div className={styles.customerRow}>
          <div className={styles.avatarLarge}>
            {order.customerName ? order.customerName[0].toUpperCase() : <FaUser />}
          </div>
          <div className={styles.customerInfo}>
            <h3 className={styles.customerHeaderName}>{order.customerName}</h3>
            <div className={styles.detailFlex}>
              <Badge variant={order.status.toLowerCase() as 'cutting' | 'sewing' | 'ready' | 'completed'}>
                {order.status}
              </Badge>
              {isOverdue(order) && (
                <Badge variant="default"><FaTriangleExclamation /> Overdue</Badge>
              )}
              {order.priority !== 'normal' && (
                <Badge variant="gold">
                  {order.priority === 'rush' ? <FaFireFlameCurved /> : <FaBolt />} {order.priority === 'rush' ? 'Rush' : 'Urgent'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className={styles.metaGrid}>
          {order.assignedToName && (
            <div className={styles.metaItem}>
              <FaUser className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <span className={styles.metaLabel}>Assigned To</span>
                <span className={styles.metaValue}>{order.assignedToName}</span>
              </div>
            </div>
          )}

          {order.dueDate && (
            <div className={styles.metaItem}>
              <FaCalendarDays className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <span className={styles.metaLabel}>Due Date</span>
                <span className={`${styles.metaValue} ${isOverdue(order) ? styles.overdueText : ''}`}>
                  {new Date(order.dueDate).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          )}

          <div className={styles.metaItem}>
            <FaClock className={styles.metaIcon} />
            <div className={styles.metaContent}>
              <span className={styles.metaLabel}>Created</span>
              <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className={styles.premiumCard}>
        <div className={styles.cardHeaderRow}>
          <span className={styles.cardSectionTitle}>
            <FaRegCommentDots /> Order Details & Notes
          </span>
          {!isEditing && (
            <button type="button" className={styles.iconBtn} onClick={startEditing} aria-label="Edit order">
              <FaPen />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className={styles.editForm}>
            <TextArea
              label="Order Details"
              value={editDetails}
              onChange={(e) => setEditDetails(e.target.value)}
              rows={3}
            />
            {userRole === 'Owner' && (
              <>
                <div className={styles.editRow}>
                  <Input
                    label="Due Date"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
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
                  <Input
                    label="Total Bill (₦)"
                    value={editTotalBill}
                    onChange={(e) => setEditTotalBill(e.target.value.replace(/[^0-9,]/g, ''))}
                    inputMode="numeric"
                  />
                </div>
              </>
            )}
            <div className={styles.editActions}>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={savingEdit} onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <p className={styles.premiumDetailText}>{order.orderDetails}</p>
        )}
      </div>

      {/* Photos Card */}
      <div className={styles.premiumCard}>
        <span className={styles.cardSectionTitle}>
          <FaCamera /> Garment Photos
        </span>
        <div className={styles.photoGrid}>
          {(order.images || []).map((src, i) => (
            <div key={i} className={styles.photoThumb}>
              <img src={src} alt={`Order photo ${i + 1}`} />
              <button type="button" className={styles.photoRemoveBtn} onClick={() => handleRemovePhoto(i)} aria-label="Remove photo">
                <FaXmark />
              </button>
            </div>
          ))}
          <label className={styles.photoUploadBtn}>
            <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            {uploadingPhoto ? '…' : <FaCamera />}
          </label>
        </div>
      </div>

      {/* Financial Summary Card (Owner Only) */}
      {userRole === 'Owner' && (
        <div className={`${styles.premiumCard} ${styles.financialCard}`}>
          <span className={styles.cardSectionTitle}>
            <FaCreditCard /> Payment Summary
          </span>
          <div className={styles.financialGrid}>
            <div className={styles.finCol}>
              <span className={styles.finLabel}>Total Bill</span>
              <span className={styles.finValue}>{formatCurrency(order.totalBill)}</span>
            </div>
            <div className={styles.finCol}>
              <span className={styles.finLabel}>Deposit Paid</span>
              <span className={styles.finValue}>{formatCurrency(order.depositPaid)}</span>
            </div>
            <div className={`${styles.finCol} ${styles.balanceCol}`}>
              <span className={styles.finLabel}>Balance Owed</span>
              <span className={styles.finGoldValue}>{formatCurrency(balanceOwed)}</span>
            </div>
          </div>

          {balanceOwed > 0 && (
            <div className={styles.recordPaymentSection}>
              <div className={styles.recordPaymentRow}>
                <Input
                  placeholder="Amount"
                  prefix="₦"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <Button variant="ghost" size="sm" onClick={() => setPaymentAmount(String(balanceOwed))}>
                  Full Balance
                </Button>
              </div>
              <Button
                variant="primary"
                fullWidth
                loading={recordingPayment}
                icon={<FaCircleCheck />}
                onClick={() => handleRecordPayment(parseInt(paymentAmount) || 0)}
              >
                Record Payment
              </Button>
            </div>
          )}

          {order.payments && order.payments.length > 0 && (
            <div className={styles.paymentHistory}>
              <span className={styles.paymentHistoryLabel}>Payment History</span>
              {order.payments
                .slice()
                .reverse()
                .map((p) => (
                  <div key={p.id} className={styles.paymentRow}>
                    <span className={styles.paymentAmount}>{formatCurrency(p.amount)}</span>
                    <span className={styles.paymentMeta}>{formatDate(p.timestamp)} · {p.recordedByName}</span>
                  </div>
                ))}
            </div>
          )}

          <div className={styles.receiptLinkRow}>
            <a
              href={`/receipt/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.receiptLink}
            >
              <FaPrint /> View / Print Receipt
            </a>
          </div>
        </div>
      )}

      {/* Communication Card */}
      <div className={styles.premiumCard}>
        <span className={styles.cardSectionTitle}>Share & Communicate</span>

        {customer && (
          <div className={styles.actionRow}>
            <span className={styles.actionRowLabel}>Customer Updates</span>
            <div className={styles.contactActions}>
              <a
                href={getWhatsAppLink(customer.whatsappNumber, whatsAppMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.premiumContactLink}
              >
                <FaWhatsapp /> Send {order.status} Update
              </a>
            </div>
          </div>
        )}

        <div className={styles.actionRow}>
          <span className={styles.actionRowLabel}>Tracking Link</span>
          <div className={styles.linkActions}>
            <div className={styles.linkInputContainer}>
              <FaLink className={styles.linkIcon} />
              <input
                type="text"
                readOnly
                value={trackingUrl}
                className={styles.premiumLinkInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {order.statusHistory.length > 0 && (
        <div className={styles.premiumTimelineSection}>
          <span className={styles.cardSectionTitle}>
            <FaTimeline /> Activity Timeline
          </span>
          <div className={styles.timelineContainer}>
            <ActivityTimeline history={order.statusHistory} />
          </div>
        </div>
      )}
    </div>
  );
}
