'use client';

import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { getWhatsAppLink } from '@/lib/formatters';
import type { OrderStatus } from '@/lib/types';
import styles from './WhatsAppOptionsSheet.module.css';

interface WhatsAppOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  whatsappNumber: string;
  progressMessage: string;
  orderStatus?: OrderStatus;
  garmentName?: string;
  shopName?: string;
  orderRef?: string;
}

export default function WhatsAppOptionsSheet({
  isOpen,
  onClose,
  customerName,
  whatsappNumber,
  progressMessage,
  orderStatus,
  garmentName,
  shopName,
  orderRef,
}: WhatsAppOptionsSheetProps) {
  const firstName = customerName.split(' ')[0] || 'Client';
  const garment = garmentName ? garmentName.replace(/\[[^\]]+\]/g, '').trim() : 'outfit';
  const shop = shopName || 'our atelier';

  const eventPhotosMessage = `Hello ${firstName}! Thank you for choosing ${shop} for your ${garment}${
    orderRef ? ` (Ref #${orderRef})` : ''
  }. We hope you love the fit and look amazing! When you wear it out to your event, please share a few pictures with us or tag us on social media so we can celebrate you in our shop lookbook.`;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} variant="modal" noPadding>
      <div className={styles.container}>
        <div className={styles.header}>
          <WhatsappIcon size={32} />
          <h3>Message {firstName}</h3>
        </div>

        <div className={styles.optionsList}>
          <a
            href={getWhatsAppLink(whatsappNumber, progressMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.optionBtn}
            onClick={onClose}
          >
            <div className={styles.optionIcon}>
              <Symbol name="send" />
            </div>
            <div className={styles.optionText}>
              <span className={styles.optionTitle}>Send Progress Report</span>
              <span className={styles.optionDesc}>Pre-filled with current order status and tracking link</span>
            </div>
          </a>

          {(orderStatus === 'Ready' || orderStatus === 'Delivered') && (
            <a
              href={getWhatsAppLink(whatsappNumber, eventPhotosMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.optionBtn}
              onClick={onClose}
            >
              <div className={styles.optionIcon} style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA' }}>
                <Symbol name="photo_camera" />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionTitle}>Request Client Event Photos</span>
                <span className={styles.optionDesc}>Ask client to send photos wearing the outfit to feature in your lookbook</span>
              </div>
            </a>
          )}

          <a
            href={getWhatsAppLink(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.optionBtn}
            onClick={onClose}
          >
            <div className={styles.optionIcon}>
              <Symbol name="chat" />
            </div>
            <div className={styles.optionText}>
              <span className={styles.optionTitle}>General Chat</span>
              <span className={styles.optionDesc}>Open an empty WhatsApp chat with the customer</span>
            </div>
          </a>
        </div>
      </div>
    </BottomSheet>
  );
}
