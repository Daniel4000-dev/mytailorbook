'use client';

import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { getWhatsAppLink } from '@/lib/formatters';
import styles from './WhatsAppOptionsSheet.module.css';

interface WhatsAppOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  whatsappNumber: string;
  progressMessage: string;
}

export default function WhatsAppOptionsSheet({
  isOpen,
  onClose,
  customerName,
  whatsappNumber,
  progressMessage,
}: WhatsAppOptionsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} variant="modal" noPadding>
      <div className={styles.container}>
        <div className={styles.header}>
          <WhatsappIcon size={32} />
          <h3>Message {customerName.split(' ')[0]}</h3>
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
