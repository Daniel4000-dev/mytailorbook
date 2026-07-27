'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaTriangleExclamation, FaDownload } from 'react-icons/fa6';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { deleteOwnShopAction, deleteOwnStaffAccountAction, exportShopDataAction } from '@/app/actions';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';

export function ExportDataButton({ shopName }: { shopName: string }) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const { data, error } = await exportShopDataAction();
    setExporting(false);
    if (error || !data) {
      showToast(error || 'Could not export data', 'error');
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `${shopName.toLowerCase().replace(/\s+/g, '-')}-data-export-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Data export downloaded', 'success');
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        padding: 'var(--sf-space-sm) var(--sf-space-md)',
        borderRadius: 'var(--sf-radius-md)',
        border: '1px solid var(--sf-border-light)',
        background: 'none',
        color: 'var(--sf-text-primary)',
        fontWeight: 'var(--sf-weight-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sf-space-sm)',
        cursor: exporting ? 'default' : 'pointer',
      }}
    >
      <FaDownload />
      {exporting ? 'Preparing export…' : 'Export My Data'}
    </button>
  );
}

export function AccountDangerZone({ isOwner, onClosingProfile }: { isOwner: boolean; onClosingProfile: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmStaffDelete, setConfirmStaffDelete] = useState(false);

  const handleDeleteShop = async () => {
    setDeleting(true);
    const { error } = await deleteOwnShopAction();
    if (error) {
      showToast(error, 'error');
      setDeleting(false);
      return;
    }
    onClosingProfile();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?deleted=1');
  };

  const handleDeleteStaffAccount = async () => {
    setDeleting(true);
    const { error } = await deleteOwnStaffAccountAction();
    if (error) {
      showToast(error, 'error');
      setDeleting(false);
      return;
    }
    onClosingProfile();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?deleted=1');
  };

  return (
    <div style={{ borderTop: '1px solid var(--sf-border-light)', paddingTop: 'var(--sf-space-md)', marginTop: 'var(--sf-space-xs)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sf-space-sm)',
          background: 'none',
          border: 'none',
          color: 'var(--sf-text-secondary)',
          fontSize: 'var(--sf-text-sm)',
          fontWeight: 'var(--sf-weight-medium)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <FaTriangleExclamation style={{ color: 'var(--sf-error)' }} />
        Danger Zone
      </button>

      {expanded && (
        <div style={{ marginTop: 'var(--sf-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-sm)' }}>
          {isOwner ? (
            <>
              <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>
                This permanently deletes your entire shop — every order, customer, staff account, and photo. This cannot be undone.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                style={{
                  padding: 'var(--sf-space-sm)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: '1px solid var(--sf-border-light)',
                  fontSize: 'var(--sf-text-sm)',
                }}
              />
              <button
                onClick={handleDeleteShop}
                disabled={confirmText !== 'DELETE' || deleting}
                style={{
                  padding: 'var(--sf-space-sm) var(--sf-space-md)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: 'none',
                  background: confirmText === 'DELETE' ? 'var(--sf-error)' : 'var(--sf-error-bg)',
                  color: confirmText === 'DELETE' ? '#fff' : 'var(--sf-error)',
                  fontWeight: 'var(--sf-weight-medium)',
                  cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Permanently Delete My Shop'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>
                This permanently deletes your own staff account. Orders assigned to you will become unassigned, not deleted.
              </p>
              <button
                onClick={() => setConfirmStaffDelete(true)}
                style={{
                  padding: 'var(--sf-space-sm) var(--sf-space-md)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: 'none',
                  background: 'var(--sf-error)',
                  color: '#fff',
                  fontWeight: 'var(--sf-weight-medium)',
                  cursor: 'pointer',
                }}
              >
                Delete My Account
              </button>
              <ConfirmDialog
                isOpen={confirmStaffDelete}
                onClose={() => setConfirmStaffDelete(false)}
                onConfirm={handleDeleteStaffAccount}
                title="Delete your account?"
                description="This permanently deletes your staff account and cannot be undone."
                confirmLabel={deleting ? 'Deleting…' : 'Delete My Account'}
                loading={deleting}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
