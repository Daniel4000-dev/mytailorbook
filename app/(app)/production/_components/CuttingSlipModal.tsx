'use client';

import { useState } from 'react';
import Image from 'next/image';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { MEASUREMENT_LABELS } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/formatters';
import { useToast } from '@/contexts/ToastContext';
import type { Order, Customer } from '@/lib/types';
import styles from './CuttingSlipModal.module.css';

interface CuttingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customer: Customer | null;
}

export default function CuttingSlipModal({ isOpen, onClose, order, customer }: CuttingSlipModalProps) {
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  if (!order) return null;

  const orderMeasurementEntries = Object.entries(order.measurements || {}).filter(
    ([key, value]) => key !== 'notes' && value !== undefined && value !== null && value !== ''
  );
  const usingOrderMeasurements = orderMeasurementEntries.length > 0;
  const measurementEntries = usingOrderMeasurements
    ? orderMeasurementEntries
    : Object.entries(customer?.measurements || {}).filter(
        ([key, value]) => key !== 'notes' && value !== undefined && value !== null && value !== ''
      );

  const fabricMatch = order.orderDetails?.match(/\[Fabric:\s*([^\]]+)\]/i);
  const fabricNote = fabricMatch ? fabricMatch[1] : null;
  const cleanOrderDetails = (order.orderDetails || '').replace(/\[Fabric:\s*[^\]]+\]/i, '').trim();

  // Yardage extraction
  const yardageMatch = order.orderDetails?.match(/(\d+(?:\.\d+)?)\s*(?:yds?|yards?)/i);
  const yardage = yardageMatch ? `${yardageMatch[1]} yds` : null;

  const photo = order.images?.[0]?.url || null;
  const isClientFabric = order.materialSuppliedBy === 'customer';
  const isShopFabric = order.materialSuppliedBy === 'shop';
  const isRush = order.priority === 'rush';
  const isUrgent = order.priority === 'urgent';
  const hasPriority = isRush || isUrgent;

  const customerName = customer?.fullName || order.customerName || 'Walk-in Client';
  const customerPhone = customer?.whatsappNumber;

  const handlePrint = () => {
    window.print();
  };

  const generateSlipText = () => {
    const lines = [
      `===============================`,
      `ATELIER WORKSHOP CUTTING SLIP`,
      `===============================`,
      `Ref: #${order.id.slice(0, 4).toUpperCase()} | ${order.styleName || 'Custom Bespoke'}`,
      `Client: ${customerName}`,
      customerPhone ? `Contact: +${customerPhone}` : null,
      fabricNote ? `Fabric: ${fabricNote}` : null,
      yardage ? `Yardage: ${yardage}` : null,
      isClientFabric ? `Material Source: Client Provided` : isShopFabric ? `Material Source: Atelier Stock` : null,
      order.dueDate ? `Due Date: ${new Date(order.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : null,
      hasPriority ? `Priority: ${isRush ? 'RUSH DELIVERY' : 'URGENT WORKSHOP'}` : null,
      order.assignedToName ? `Assigned Artisan: ${order.assignedToName}` : null,
      ``,
      `--- CUTTING MEASUREMENTS ---`,
      ...measurementEntries.map(([key, val]) => `• ${MEASUREMENT_LABELS[key] || key}: ${val}"`),
      cleanOrderDetails ? `\n--- TAILOR NOTES & CUTTING SPEC ---\n${cleanOrderDetails}` : null,
      `===============================`,
      `MyTailorBook Atelier OS`,
    ];
    return lines.filter(Boolean).join('\n');
  };

  const handleShareToCutter = async () => {
    const slipText = generateSlipText();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Cutting Slip #${order.id.slice(0, 4).toUpperCase()}`,
          text: slipText,
        });
        showToast('Cutting slip dispatched!', 'success');
        return;
      } catch {
        // Fallback to clipboard & WhatsApp on cancellation or unsupported desktop
      }
    }

    try {
      await navigator.clipboard.writeText(slipText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      showToast('Cutting slip copied! Opening WhatsApp…', 'success');
    } catch {
      // Ignore clipboard error
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(slipText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopySlip = async () => {
    const slipText = generateSlipText();
    try {
      await navigator.clipboard.writeText(slipText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      showToast('Cutting slip copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} variant="modal" noPadding>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.slipEyebrowRow}>
              <span className={styles.slipEyebrow}>Workshop Cutting Slip</span>
              {hasPriority && (
                <span className={`${styles.priorityPill} ${isRush ? styles.rushPill : styles.urgentPill}`}>
                  <Symbol name={isRush ? 'local_fire_department' : 'bolt'} size={11} />
                  <span>{isRush ? 'Rush Order' : 'Urgent'}</span>
                </span>
              )}
            </div>
            <h3 className={styles.title}>{order.styleName || cleanOrderDetails || 'Custom Garment'}</h3>
            <span className={styles.refTag}>Ref: #{order.id.slice(0, 4).toUpperCase()}</span>
          </div>

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.dispatchBtn}
              onClick={handleShareToCutter}
              title="Send cutting slip to cutter or apprentice on WhatsApp"
            >
              <WhatsappIcon size={14} />
              <span>Share Slip</span>
            </button>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopySlip}
              title="Copy cutting slip text"
            >
              <Symbol name={isCopied ? 'check' : 'content_copy'} size={14} />
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              className={styles.printBtn}
              onClick={handlePrint}
              aria-label="Print cutting slip"
            >
              <Symbol name="print" size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Customer Card */}
        <div className={styles.customerCard}>
          <div className={styles.customerInfo}>
            <span className={styles.customerName}>{customerName}</span>
            {customerPhone && (
              <span className={styles.customerPhone}>+{customerPhone}</span>
            )}
            {order.assignedToName && (
              <div className={styles.assignedCutterTag}>
                <Symbol name="engineering" size={12} />
                <span>Cutter: {order.assignedToName}</span>
              </div>
            )}
          </div>
          {customerPhone && (
            <div className={styles.customerActions}>
              <a
                href={`tel:+${customerPhone}`}
                className={styles.actionIconBtn}
                aria-label={`Call ${customerName}`}
              >
                <Symbol name="call" size={16} />
              </a>
              <a
                href={getWhatsAppLink(customerPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionIconBtn}
                aria-label={`WhatsApp ${customerName}`}
              >
                <WhatsappIcon size={16} />
              </a>
            </div>
          )}
        </div>

        {/* Fabric Swatch & Specifications */}
        {(photo || fabricNote || yardage) && (
          <div className={styles.fabricCard}>
            <div className={styles.fabricHeaderRow}>
              <span className={styles.fabricLabel}>Fabric Specification</span>
              <div className={styles.fabricBadgesRow}>
                {yardage && (
                  <span className={styles.yardageBadge}>
                    <Symbol name="straighten" size={11} />
                    <span>{yardage}</span>
                  </span>
                )}
                {isClientFabric && (
                  <span className={styles.provenancePill}>
                    <Symbol name="person" size={11} />
                    <span>Client Provided</span>
                  </span>
                )}
                {isShopFabric && (
                  <span className={styles.provenancePill}>
                    <Symbol name="storefront" size={11} />
                    <span>Atelier Stock</span>
                  </span>
                )}
              </div>
            </div>

            <div className={styles.fabricBodyRow}>
              {photo && (
                <div className={styles.fabricThumbWrap}>
                  <Image
                    src={photo}
                    alt={fabricNote || 'Cloth Swatch'}
                    fill
                    sizes="72px"
                    className={styles.fabricThumb}
                    unoptimized
                  />
                </div>
              )}
              <div className={styles.fabricDetailsCol}>
                <p className={styles.fabricContent}>
                  {fabricNote || (order.styleName ? `Fabric for ${order.styleName}` : 'Custom atelier fabric')}
                </p>
                {order.dueDate && (
                  <span className={styles.dueDateNotice}>
                    <Symbol name="schedule" size={12} />
                    <span>Due in workshop: {new Date(order.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Measurements Grid */}
        <div className={styles.measureSection}>
          <div className={styles.measureSectionHeader}>
            <h4 className={styles.sectionTitle}>Cutting Measurements</h4>
            <span className={styles.measureSourceHint}>
              {usingOrderMeasurements ? 'Garment specific' : 'Customer profile'}
            </span>
          </div>

          {measurementEntries.length === 0 ? (
            <div className={styles.emptyMeasures}>
              <span>No measurements recorded for this garment or customer yet.</span>
            </div>
          ) : (
            <div className={styles.measureGrid}>
              {measurementEntries.map(([key, value]) => (
                <div key={key} className={styles.measureTile}>
                  <span className={styles.measureLabel}>
                    {MEASUREMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <span className={styles.measureValue}>{value}&quot;</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tailor Notes & Instructions */}
        {cleanOrderDetails && (
          <div className={styles.notesCard}>
            <span className={styles.notesLabel}>Tailor Notes &amp; Styling Details</span>
            <p className={styles.notesText}>{cleanOrderDetails}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
