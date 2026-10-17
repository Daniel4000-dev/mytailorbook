'use client';

import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { MEASUREMENT_LABELS } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/formatters';
import type { Order, Customer } from '@/lib/types';
import styles from './CuttingSlipModal.module.css';

interface CuttingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customer: Customer | null;
}

export default function CuttingSlipModal({ isOpen, onClose, order, customer }: CuttingSlipModalProps) {
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

  const fabricMatch = order.orderDetails.match(/\[Fabric:\s*([^\]]+)\]/i);
  const fabricNote = fabricMatch ? fabricMatch[1] : null;
  const cleanOrderDetails = order.orderDetails.replace(/\[Fabric:\s*[^\]]+\]/i, '').trim();

  const handlePrint = () => {
    window.print();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} variant="modal" noPadding>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.slipEyebrow}>Workshop Cutting Slip</span>
            <h3 className={styles.title}>{order.styleName || cleanOrderDetails || 'Custom Garment'}</h3>
            <span className={styles.refTag}>Ref: #{order.id.slice(0, 4).toUpperCase()}</span>
          </div>
          <div className={styles.headerRight}>
            <button type="button" className={styles.printBtn} onClick={handlePrint} aria-label="Print cutting slip">
              <Symbol name="print" size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className={styles.customerCard}>
          <div className={styles.customerInfo}>
            <span className={styles.customerName}>{order.customerName || 'Walk-in Client'}</span>
            {customer?.whatsappNumber && (
              <span className={styles.customerPhone}>+{customer.whatsappNumber}</span>
            )}
          </div>
          {customer?.whatsappNumber && (
            <div className={styles.customerActions}>
              <a
                href={`tel:+${customer.whatsappNumber}`}
                className={styles.actionIconBtn}
                aria-label="Call customer"
              >
                <Symbol name="call" size={18} />
              </a>
              <a
                href={getWhatsAppLink(customer.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionIconBtn}
                aria-label="WhatsApp customer"
              >
                <WhatsappIcon size={18} />
              </a>
            </div>
          )}
        </div>

        {fabricNote && (
          <div className={styles.fabricCard}>
            <span className={styles.fabricLabel}>Fabric Specification</span>
            <p className={styles.fabricContent}>{fabricNote}</p>
          </div>
        )}

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
