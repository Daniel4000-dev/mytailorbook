'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { useToast } from '@/contexts/ToastContext';
import styles from './InviteColleaguesModal.module.css';

interface InviteColleaguesModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
  shopName?: string;
  shopSlug?: string;
}

export default function InviteColleaguesModal({
  isOpen,
  onClose,
  referralCode,
  shopName,
  shopSlug,
}: InviteColleaguesModalProps) {
  const { showToast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mystitchbook.com';
  const effectiveCode = referralCode || (shopSlug ? shopSlug.toUpperCase() : 'STITCHBOOK');
  const inviteUrl = `${origin}/signup?ref=${encodeURIComponent(effectiveCode)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showToast('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Unable to copy automatically. Please copy manually.', 'error');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(effectiveCode);
      setCopiedCode(true);
      showToast('Invite code copied!', 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast('Unable to copy code.', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    const fromWorkshop = shopName ? ` from ${shopName}` : '';
    const message = `Hello! Join me on MyStitchBook${fromWorkshop} — the modern management app for fashion designers and tailoring houses. Tap this link to get started:\n\n${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join MyStitchBook',
          text: `Join me on MyStitchBook — the modern management app for tailoring houses:`,
          url: inviteUrl,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Colleagues"
      variant="modal"
      subHeader={
        <p className={styles.subHeaderText}>
          Share your personal invite link with tailoring colleagues and designers to welcome them to MyStitchBook.
        </p>
      }
    >
      <div className={styles.container}>
        {/* Visual Invite Code Card */}
        <div className={styles.codeCard}>
          <div className={styles.codeCardHeader}>
            <span className={styles.codeLabel}>YOUR WORKSHOP INVITE CODE</span>
            <button
              type="button"
              className={styles.copyCodeBtn}
              onClick={handleCopyCode}
              title="Copy Invite Code"
            >
              <Symbol name={copiedCode ? 'check' : 'content_copy'} size={14} />
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className={styles.codeValue}>{effectiveCode}</div>
        </div>

        {/* Invite Link Row */}
        <div className={styles.linkSection}>
          <label className={styles.linkLabel} htmlFor="invite-url-field">
            Shareable Invite Link
          </label>
          <div className={styles.linkRow}>
            <input
              id="invite-url-field"
              type="text"
              readOnly
              value={inviteUrl}
              className={styles.linkInput}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              className={styles.copyLinkBtn}
              onClick={handleCopyLink}
              title="Copy full invite link"
            >
              <Symbol name={copiedLink ? 'check' : 'content_copy'} size={15} />
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.whatsAppBtn}
            onClick={handleShareWhatsApp}
          >
            <WhatsappIcon size={18} />
            <span>Share via WhatsApp</span>
          </button>

          <button
            type="button"
            className={styles.shareBtn}
            onClick={handleNativeShare}
          >
            <Symbol name="share" size={16} />
            <span>More Options</span>
          </button>
        </div>

        {/* Context Hint */}
        <div className={styles.hintBox}>
          <div className={styles.hintIconWrap}>
            <Symbol name="group_add" size={16} />
          </div>
          <p className={styles.hintText}>
            When colleagues register using your invite link, they will appear in your network. You can then connect with them directly in Tailor Circle to hold each other accountable to daily sewing streaks.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
