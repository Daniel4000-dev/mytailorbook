'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { resetStaffPasswordAction } from '@/app/actions';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Avatar from '@/components/ui/Avatar/Avatar';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import type { User } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PREMIUM_STATUSES } from '@/lib/subscription';
import styles from './page.module.css';

type StaffSheetView = 'actions' | 'edit' | 'password';

export default function StaffSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentShop, staffMembers, addStaff, updateStaff, isLoaded } = useData();
  const isPremium = !!currentShop && PREMIUM_STATUSES.includes(currentShop.subscriptionStatus);
  const { showToast } = useToast();

  const [activeStaff, setActiveStaff] = useState<User | null>(null);
  const [sheetView, setSheetView] = useState<StaffSheetView>('actions');
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);

  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Staff' | 'BranchManager' | 'Accountant'>('Staff');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const openStaffSheet = (staff: User) => {
    setActiveStaff(staff);
    setSheetView('actions');
    setGeneratedPassword(null);
    setCustomPassword('');
    setCopied(false);
  };

  const closeStaffSheet = () => setActiveStaff(null);

  const handleSaveEdit = async () => {
    if (!activeStaff) return;
    setSavingEdit(true);
    try {
      await updateStaff(activeStaff.uid, { name: editName });
      showToast('Staff member updated', 'success');
      closeStaffSheet();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async () => {
    if (!activeStaff || !user) return;
    setResettingPassword(true);
    try {
      const result = await resetStaffPasswordAction(activeStaff.uid, customPassword || undefined);
      if (result.error) {
        showToast(result.error, 'error');
      } else if (result.password) {
        setGeneratedPassword(result.password);
        showToast(`Password reset for ${activeStaff.name}`, 'success');
      }
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    if (!confirmDeactivate) return;
    const staff = confirmDeactivate;
    setConfirmDeactivate(null);
    const currentlyActive = staff.active !== false;
    await updateStaff(staff.uid, { active: !currentlyActive });
    showToast(currentlyActive ? 'Staff member deactivated' : 'Staff member reactivated', 'success');
    closeStaffSheet();
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      await addStaff(name, email, password, newStaffRole);
      setName('');
      setEmail('');
      setPassword('');
      setNewStaffRole('Staff');
      setIsAddSheetOpen(false);
      showToast(`${name} added as staff`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add staff member.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <PageLayout width="narrow"
      header={
        <TopBar
          title="Staff"
          showBack
          onBack={() => router.push('/settings')}
          rightAction={
            <CircleIconButton
              icon={<Symbol name="person_add" size={18} />}
              onClick={() => (isPremium ? setIsAddSheetOpen(true) : setIsUpsellOpen(true))}
              ariaLabel="Register employee"
            />
          }
        />
      }
    >
      {!isLoaded ? (
        <div className={styles.card}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : staffMembers.length === 0 ? (
        <EmptyState
          icon={<Symbol name="group" size={40} />}
          title="No staff yet"
          description={
            isPremium
              ? 'Add your first team member to get started.'
              : 'Staff accounts are a Premium feature — upgrade to add your first team member.'
          }
        />
      ) : (
        <div className={styles.card}>
          {staffMembers.map((staff) => {
            const isActive = staff.active !== false;
            return (
              <button
                key={staff.uid}
                type="button"
                className={styles.row}
                onClick={() => openStaffSheet(staff)}
              >
                <Avatar name={staff.name} imageUrl={staff.avatarUrl} size="sm" />
                <span className={styles.textCol}>
                  <span className={styles.label}>
                    {staff.name}
                    {!isActive && <span className={styles.inactiveBadge}>Inactive</span>}
                  </span>
                  <span className={styles.subtitle}>{staff.role} · {staff.email}</span>
                </span>
                <Symbol name="chevron_right" size={18} className={styles.chevron} />
              </button>
            );
          })}
        </div>
      )}

      <BottomSheet isOpen={!!activeStaff} onClose={closeStaffSheet} title={activeStaff?.name}>
        {activeStaff && sheetView === 'actions' && (
          <div className={styles.actionList}>
            <button
              type="button"
              className={styles.actionRow}
              onClick={() => {
                setEditName(activeStaff.name);
                setSheetView('edit');
              }}
            >
              <Symbol name="edit" size={20} className={styles.actionIcon} />
              <span>Edit Name</span>
            </button>
            <button type="button" className={styles.actionRow} onClick={() => setSheetView('password')}>
              <Symbol name="lock_reset" size={20} className={styles.actionIcon} />
              <span>Reset Password</span>
            </button>
            <button
              type="button"
              className={styles.actionRow}
              onClick={() => setConfirmDeactivate(activeStaff)}
            >
              <Symbol
                name={activeStaff.active !== false ? 'person_off' : 'person'}
                size={20}
                className={`${styles.actionIcon} ${activeStaff.active !== false ? styles.actionIconDanger : ''}`}
              />
              <span className={activeStaff.active !== false ? styles.actionLabelDanger : ''}>
                {activeStaff.active !== false ? 'Deactivate' : 'Reactivate'}
              </span>
            </button>
          </div>
        )}

        {activeStaff && sheetView === 'edit' && (
          <div className={styles.sheetBody}>
            <Input label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className={styles.sheetActions}>
              <Button variant="ghost" onClick={() => setSheetView('actions')}>Back</Button>
              <Button variant="primary" loading={savingEdit} onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        )}

        {activeStaff && sheetView === 'password' && (
          <div className={styles.sheetBody}>
            {generatedPassword ? (
              <>
                <p className={styles.hintText}>
                  Share this with {activeStaff.name} so they can log in with it.
                </p>
                <div className={styles.passwordReveal}>
                  <span>{generatedPassword}</span>
                  <button type="button" onClick={handleCopyPassword} className={styles.copyBtn}>
                    <Symbol name={copied ? 'check' : 'content_copy'} size={16} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <Button variant="primary" onClick={closeStaffSheet}>Done</Button>
              </>
            ) : (
              <>
                <p className={styles.hintText}>
                  We&apos;ll generate a secure temporary password — or type your own below.
                </p>
                <Input
                  label="Custom password (optional)"
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
                <div className={styles.sheetActions}>
                  <Button variant="ghost" onClick={() => setSheetView('actions')}>Back</Button>
                  <Button variant="primary" loading={resettingPassword} onClick={handleResetPassword}>
                    Reset Password
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleToggleActive}
        title={
          confirmDeactivate?.active !== false
            ? `Deactivate ${confirmDeactivate?.name}?`
            : `Reactivate ${confirmDeactivate?.name}?`
        }
        description={
          confirmDeactivate?.active !== false
            ? "They'll lose access to the app immediately. Their past orders and history stay intact."
            : "They'll be able to log in again right away."
        }
        confirmLabel={confirmDeactivate?.active !== false ? 'Deactivate' : 'Reactivate'}
        destructive={confirmDeactivate?.active !== false}
      />

      <BottomSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} title="Register Employee">
        <form onSubmit={handleAddStaff} className={styles.sheetBody}>
          <Input label="Full Name" placeholder="e.g. Chioma Eze" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email/Username" type="email" placeholder="e.g. chioma@mystitchbooks.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Temporary Password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {FEATURE_FLAGS.orgBranchMultiTenancy && (
            <>
              <label className={styles.label} htmlFor="new-staff-role">Role</label>
              <select
                id="new-staff-role"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as 'Staff' | 'BranchManager' | 'Accountant')}
                style={{
                  padding: 'var(--sf-space-sm)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: '1px solid var(--sf-border-light)',
                  fontSize: 'var(--sf-text-sm)',
                }}
              >
                <option value="Staff">Staff</option>
                <option value="BranchManager">Branch Manager</option>
                <option value="Accountant">Accountant</option>
              </select>
            </>
          )}
          {addError && <p className={styles.errorText}>{addError}</p>}
          <Button type="submit" variant="primary" loading={addLoading}>Add Staff Member</Button>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={isUpsellOpen} onClose={() => setIsUpsellOpen(false)} title="Staff Accounts">
        <div className={styles.sheetBody}>
          <p className={styles.hintText}>
            Adding team members is a Premium feature. Upgrade to give staff their own login, track who&apos;s handling
            each order, and unlock analytics — all while your free-tier customers, orders, and styles stay exactly as
            they are.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setIsUpsellOpen(false);
              router.push('/settings?sheet=plans');
            }}
          >
            View Plans
          </Button>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
