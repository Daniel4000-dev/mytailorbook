'use client';

import { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Order, OrderPhoto, OrderStatus } from '@/lib/types';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { compressImage } from '@/lib/compressImage';
import { createClient } from '@/lib/supabase/client';
import { getWhatsAppLink } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import styles from './FabricDetailSheet.module.css';

const STATUS_LABELS: Record<string, string> = {
  Documented: 'Documented',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Delivered: 'Delivered',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isOverdue(order: Order): boolean {
  if (!order.dueDate || order.status === 'Delivered') return false;
  return new Date(order.dueDate) < new Date();
}

interface FabricDetailSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCuttingSlip?: (order: Order) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onAssignArtisan?: (orderId: string, artisanName: string) => Promise<void>;
}

export default function FabricDetailSheet({
  order,
  isOpen,
  onClose,
  onOpenCuttingSlip,
  onUpdateOrderStatus,
  onAssignArtisan,
}: FabricDetailSheetProps) {
  const router = useRouter();
  const { customers, currentShop, staffMembers, updateOrder, updateOrderStatus } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isEditingArtisan, setIsEditingArtisan] = useState(false);
  const [customArtisanName, setCustomArtisanName] = useState('');

  const customer = useMemo(() => {
    if (!order) return null;
    return (
      customers.find(
        (c) =>
          c.id === order.customerId ||
          (c.fullName && c.fullName.toLowerCase() === order.customerName?.toLowerCase())
      ) || null
    );
  }, [customers, order]);

  if (!order) return null;

  const photo = order.images?.[0]?.url ?? null;
  const overdue = isOverdue(order);
  const isRush = order.priority === 'rush';
  const isUrgent = order.priority === 'urgent';
  const hasPriority = isRush || isUrgent;
  const isClientFabric = order.materialSuppliedBy === 'customer';
  const isShopFabric = order.materialSuppliedBy === 'shop';

  // Yardage extraction
  const yardageMatch = order.orderDetails?.match(/(\d+(?:\.\d+)?)\s*(?:yds?|yards?)/i);
  const yardage = yardageMatch ? `${yardageMatch[1]} yds` : null;

  const shopName = currentShop?.name || 'the atelier';
  const clientPhone = customer?.whatsappNumber;
  const clientName = customer?.fullName || order.customerName || 'Walk-in Client';

  const whatsappLink = useMemo(() => {
    if (!clientPhone || !order) return null;
    const garmentStyle = order.styleName || 'bespoke order';
    const text = `Good day ${clientName}, this is ${shopName}. We are preparing to cut the fabric for your ${garmentStyle} order (#${order.id.slice(0, 4).toUpperCase()}) and wanted to quickly confirm the details with you.`;
    return getWhatsAppLink(clientPhone, text);
  }, [clientPhone, clientName, order, shopName]);

  const handleOpenOrder = () => {
    onClose();
    router.push(ROUTES.productionOrder(order.id));
  };

  const handleTransition = async (targetStatus: OrderStatus, successMessage: string) => {
    setIsAdvancing(true);
    try {
      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(order.id, targetStatus);
      } else {
        await updateOrderStatus(
          order.id,
          targetStatus,
          user?.uid || 'tailor',
          user?.name || 'Master Cutter'
        );
      }
      showToast(successMessage, 'success');
      if (targetStatus === 'Cutting' && onOpenCuttingSlip) {
        onOpenCuttingSlip(order);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update order stage', 'error');
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleAssign = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (onAssignArtisan) {
        await onAssignArtisan(order.id, trimmed);
      } else {
        await updateOrder(order.id, { assignedToName: trimmed });
      }
      showToast(`Artisan assigned to ${trimmed}!`, 'success');
      setIsEditingArtisan(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign artisan', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      let url: string;
      try {
        const supabase = createClient();
        const ext = compressed.name.split('.').pop() || 'jpg';
        const path = `${order.shopId}/${order.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('order-photos').upload(path, compressed, {
          cacheControl: '3600',
          upsert: false,
        });
        if (error) throw error;
        url = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;
      } catch {
        // Fallback to object URL in offline or demo environment
        url = URL.createObjectURL(file);
      }
      const newPhoto: OrderPhoto = {
        url,
        stage: order.status,
        uploadedAt: new Date().toISOString(),
      };
      await updateOrder(order.id, {
        images: [...(order.images || []), newPhoto],
      });
      showToast('Fabric photo attached to order!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to attach photo', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} noPadding>
      {/* Hidden file input for in-place photo capture */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
      />

      {/* Hero photo */}
      <div className={styles.heroWrap}>
        {photo ? (
          <>
            <Image
              src={photo}
              alt={`Fabric for ${clientName}`}
              fill
              sizes="(max-width: 1024px) 100vw, 480px"
              className={styles.heroPhoto}
              unoptimized
            />
            <button
              type="button"
              className={styles.replacePhotoBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="Change fabric photo"
            >
              <Symbol name="photo_camera" size={14} />
              <span>{isUploading ? 'Uploading…' : 'Change Photo'}</span>
            </button>
          </>
        ) : (
          <div className={styles.heroNoPhoto}>
            <Symbol name="texture" size={44} className={styles.heroNoPhotoIcon} />
            <span className={styles.heroNoPhotoLabel}>No fabric swatch photo yet</span>
            <button
              type="button"
              className={styles.snapPhotoBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Symbol name="photo_camera" size={16} />
              <span>{isUploading ? 'Uploading…' : 'Snap / Upload Swatch'}</span>
            </button>
          </div>
        )}

        {/* Status badge overlaid on photo */}
        <span className={`${styles.statusBadge} ${styles[`status_${order.status}`]}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Apple Liquid Glass Swatch Specification Pills */}
        <div className={styles.specBadgesRow}>
          {yardage && (
            <span className={styles.specBadgeYardage}>
              <Symbol name="straighten" size={13} />
              <span>{yardage}</span>
            </span>
          )}
          {isClientFabric && (
            <span className={styles.specBadgeClient}>
              <Symbol name="person" size={13} />
              <span>Client Sourced Material</span>
            </span>
          )}
          {isShopFabric && (
            <span className={styles.specBadgeShop}>
              <Symbol name="storefront" size={13} />
              <span>Atelier Stock</span>
            </span>
          )}
          {hasPriority && (
            <span className={`${styles.specBadgePriority} ${isRush ? styles.priorityRush : styles.priorityUrgent}`}>
              <Symbol name={isRush ? 'local_fire_department' : 'bolt'} size={13} />
              <span>{isRush ? 'Rush Delivery' : 'Urgent Workshop Order'}</span>
            </span>
          )}
        </div>

        {/* Customer & Direct Contact Card */}
        <div className={styles.customerCard}>
          <div className={styles.customerMetaRow}>
            <div className={styles.customerNameWrap}>
              <Symbol name="person" size={18} className={styles.rowIcon} />
              <div>
                <span className={styles.customerName}>{clientName}</span>
                {clientPhone && <div className={styles.customerPhoneText}>+{clientPhone}</div>}
              </div>
            </div>

            {clientPhone && (
              <a
                href={`tel:${clientPhone}`}
                className={styles.callBtn}
                aria-label={`Call ${clientName}`}
              >
                <Symbol name="call" size={14} />
                <span>Call</span>
              </a>
            )}
          </div>

          {whatsappLink && (
            <div className={styles.contactActionsRow}>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappBtn}
              >
                <WhatsappIcon size={15} />
                <span>Clarify on WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        <div className={styles.divider} />

        {/* Order & Cutting Details */}
        <div className={styles.section}>
          {order.styleName && (
            <div className={styles.row}>
              <Symbol name="checkroom" size={16} className={styles.rowIcon} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Garment Style</span>
                <span className={styles.rowValue}>{order.styleName}</span>
              </div>
            </div>
          )}

          {order.orderDetails && (
            <div className={styles.row}>
              <Symbol name="notes" size={16} className={styles.rowIcon} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Cutting & Design Instructions</span>
                <span className={styles.rowValue}>{order.orderDetails}</span>
              </div>
            </div>
          )}

          {/* Assigned Artisan Section with Interactive Reassignment */}
          <div className={styles.row}>
            <Symbol name="engineering" size={16} className={styles.rowIcon} />
            <div className={styles.rowContent}>
              <div className={styles.artisanHeaderRow}>
                <span className={styles.rowLabel}>Assigned Artisan</span>
                <button
                  type="button"
                  className={styles.artisanChangeBtn}
                  onClick={() => setIsEditingArtisan(!isEditingArtisan)}
                >
                  <Symbol name={isEditingArtisan ? 'close' : 'edit'} size={12} />
                  <span>{isEditingArtisan ? 'Cancel' : 'Change'}</span>
                </button>
              </div>

              {!isEditingArtisan ? (
                <span className={styles.rowValue}>
                  {order.assignedToName || 'Unassigned (Waiting on Cutter)'}
                </span>
              ) : (
                <div className={styles.artisanSelectorWrap}>
                  {staffMembers && staffMembers.length > 0 && (
                    <div className={styles.artisanStaffChips}>
                      {staffMembers.map((staff) => (
                        <button
                          key={staff.uid}
                          type="button"
                          className={`${styles.staffChip} ${order.assignedToName === staff.name ? styles.staffChipActive : ''}`}
                          onClick={() => handleAssign(staff.name)}
                        >
                          {staff.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.customArtisanInputRow}>
                    <input
                      type="text"
                      className={styles.artisanInput}
                      placeholder="Or enter cutter/machinist name…"
                      value={customArtisanName}
                      onChange={(e) => setCustomArtisanName(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.saveArtisanBtn}
                      onClick={() => handleAssign(customArtisanName)}
                      disabled={!customArtisanName.trim()}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {order.dueDate && (
            <div className={styles.row}>
              <Symbol
                name={overdue ? 'warning' : 'event'}
                size={16}
                className={`${styles.rowIcon} ${overdue ? styles.overdueIcon : ''}`}
              />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Workshop Due Date</span>
                <span className={`${styles.rowValue} ${overdue ? styles.overdueText : ''}`}>
                  {formatDate(order.dueDate)}
                  {overdue ? ' · Overdue' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Workshop CTAs & Stage Transitions */}
        <div className={styles.actionsGroup}>
          {order.status === 'Documented' && (
            <button
              type="button"
              className={styles.advanceBtn}
              onClick={() => handleTransition('Cutting', 'Order moved to Cutting (On the Shears)!')}
              disabled={isAdvancing}
            >
              <Symbol name="content_cut" size={18} />
              <span>{isAdvancing ? 'Advancing Stage…' : 'Advance to Cutting (On the Shears)'}</span>
            </button>
          )}

          {order.status === 'Cutting' && (
            <>
              <button
                type="button"
                className={styles.passToSewingBtn}
                onClick={() => handleTransition('Sewing', 'Cloth cut! Garment passed to Sewing Bench.')}
                disabled={isAdvancing}
              >
                <Symbol name="precision_manufacturing" size={18} />
                <span>{isAdvancing ? 'Updating Stage…' : 'Pass to Sewing Bench (Machinist)'}</span>
              </button>
              <button
                type="button"
                className={styles.revertBtn}
                onClick={() => handleTransition('Documented', 'Returned to Waiting Table.')}
                disabled={isAdvancing}
              >
                <Symbol name="arrow_back" size={14} />
                <span>Return to Table (Documented)</span>
              </button>
            </>
          )}

          {order.status === 'Sewing' && (
            <>
              <button
                type="button"
                className={styles.markReadyBtn}
                onClick={() => handleTransition('Ready', 'Garment assembly finished! Ready for client.')}
                disabled={isAdvancing}
              >
                <Symbol name="checkroom" size={18} />
                <span>{isAdvancing ? 'Updating Stage…' : 'Mark Garment Ready'}</span>
              </button>
              <button
                type="button"
                className={styles.revertBtn}
                onClick={() => handleTransition('Cutting', 'Returned to Cutting Table.')}
                disabled={isAdvancing}
              >
                <Symbol name="arrow_back" size={14} />
                <span>Return to Shears (Cutting)</span>
              </button>
            </>
          )}

          <div className={styles.secondaryActionsRow}>
            {onOpenCuttingSlip && (
              <button
                type="button"
                className={styles.cuttingSlipBtn}
                onClick={() => {
                  onClose();
                  onOpenCuttingSlip(order);
                }}
              >
                <Symbol name="straighten" size={16} />
                <span>Cutting Slip</span>
              </button>
            )}

            <button type="button" className={styles.openOrderBtn} onClick={handleOpenOrder}>
              <Symbol name="open_in_new" size={16} />
              <span>Full Order</span>
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
