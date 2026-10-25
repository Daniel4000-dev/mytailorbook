'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
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
import type { User, AtelierCraftRole } from '@/lib/types';
import { CRAFT_ROLE_LABELS } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PREMIUM_STATUSES } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import RunPayrollSheet from './_components/RunPayrollSheet';
import styles from './page.module.css';

type StaffSheetView = 'actions' | 'edit' | 'password' | 'payroll';

export default function StaffSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentShop, staffMembers, addStaff, updateStaff, isLoaded, orders } = useData();
  const isPremium = !!currentShop && PREMIUM_STATUSES.includes(currentShop.subscriptionStatus);
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [activeStaff, setActiveStaff] = useState<User | null>(null);
  const [sheetView, setSheetView] = useState<StaffSheetView>('actions');
  const [editName, setEditName] = useState('');
  const [editCraftRole, setEditCraftRole] = useState<AtelierCraftRole>('general');
  const [editPayrollType, setEditPayrollType] = useState<User['payrollType']>('none');
  const [editPayrollAmount, setEditPayrollAmount] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);

  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isPayrollSheetOpen, setIsPayrollSheetOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Staff' | 'BranchManager' | 'Accountant'>('Staff');
  const [newStaffCraftRole, setNewStaffCraftRole] = useState<AtelierCraftRole>('tailor');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const openStaffSheet = (staff: User) => {
    setActiveStaff(staff);
    setEditCraftRole(staff.craftRole || 'general');
    setEditName(staff.name);
    setSheetView('actions');
    setGeneratedPassword(null);
    setCustomPassword('');
    setCopied(false);
  };

  const closeStaffSheet = () => setActiveStaff(null);

  const handleSavePayroll = async () => {
    if (!activeStaff) return;
    setSavingEdit(true);
    try {
      await updateStaff(activeStaff.uid, { 
        payrollType: editPayrollType,
        payrollAmount: editPayrollType === 'none' ? 0 : Number(editPayrollAmount) || 0
      });
      setSheetView('actions');
      showToast('Payroll structure updated', 'success');
    } catch {
      showToast('Could not save payroll structure', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!activeStaff) return;
    setSavingEdit(true);
    try {
      await updateStaff(activeStaff.uid, { name: editName, craftRole: editCraftRole });
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
      if (!result || 'error' in result) {
        showToast(result?.error ?? 'Failed to reset password', 'error');
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
      await addStaff(name, email, password, newStaffRole, newStaffCraftRole);
      setName('');
      setEmail('');
      setPassword('');
      setNewStaffRole('Staff');
      setNewStaffCraftRole('tailor');
      setIsAddSheetOpen(false);
      showToast(`${name} added to atelier team`, 'success');
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
          title="Staff & Artisans"
          showBack={!isDesktop}
          onBack={() => router.push(ROUTES.settings)}
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
              ? 'Add your first cutter, tailor, or apprentice to get started.'
              : 'Staff accounts are a Premium feature — upgrade to add your first team member.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.card}>
            {staffMembers.map((staff) => {
              const isActive = staff.active !== false;
              const craftLabel = CRAFT_ROLE_LABELS[staff.craftRole || 'general'];
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
                      <span className={`${styles.craftBadge} ${staff.craftRole === 'apprentice' ? styles.craftBadgeApprentice : ''}`}>
                        {craftLabel}
                      </span>
                      {!isActive && <span className={styles.inactiveBadge}>Inactive</span>}
                    </span>
                    <span className={styles.subtitle}>
                      {staff.payrollType === 'piece_rate' && staff.payrollAmount
                        ? `₦${staff.payrollAmount.toLocaleString()} / piece`
                        : staff.payrollType === 'salary' && staff.payrollAmount
                        ? `₦${staff.payrollAmount.toLocaleString()} / wk`
                        : staff.craftRole === 'apprentice'
                        ? 'Apprentice Stipend'
                        : staff.role} · {staff.email}
                    </span>
                  </span>
                  <Symbol name="chevron_right" size={18} className={styles.chevron} />
                </button>
              );
            })}
          </div>

          <Button variant="secondary" onClick={() => setIsPayrollSheetOpen(true)} fullWidth>
            <Symbol name="payments" size={18} /> Run Weekly Payroll
          </Button>
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
            <button
              type="button"
              className={styles.actionRow}
              onClick={() => {
                setEditPayrollType(activeStaff.payrollType || 'none');
                setEditPayrollAmount(activeStaff.payrollAmount ? String(activeStaff.payrollAmount) : '');
                setSheetView('payroll');
              }}
            >
              <Symbol name="payments" size={20} className={styles.actionIcon} />
              <span>Payment Structure</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--sf-text-secondary)' }}>Atelier Craft Specialization</label>
              <select
                value={editCraftRole}
                onChange={(e) => setEditCraftRole(e.target.value as AtelierCraftRole)}
                className={styles.selectInput}
              >
                <option value="cutter">Master Cutter (Pattern & Cutting Table)</option>
                <option value="tailor">Tailor / Machinist (Assembly & Sewing)</option>
                <option value="apprentice">Apprentice / Trainee (Finishing & Prep)</option>
                <option value="finisher">Finisher / Presser (Hemming & Steam)</option>
                <option value="embroiderer">Embroiderer (Monograms & Stitches)</option>
                <option value="general">General Artisan</option>
              </select>
            </div>
            <div className={styles.sheetActions} style={{ marginTop: '20px' }}>
              <Button variant="ghost" onClick={() => setSheetView('actions')}>Back</Button>
              <Button variant="primary" loading={savingEdit} onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        )}

        {activeStaff && sheetView === 'payroll' && (
          <div className={styles.sheetBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--sf-text-secondary)' }}>Payment Structure</label>
                <select
                  value={editPayrollType}
                  onChange={(e) => setEditPayrollType(e.target.value as User['payrollType'])}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--sf-radius-md)',
                    border: '1px solid var(--sf-border-color)',
                    background: 'var(--sf-bg-surface)',
                    color: 'var(--sf-text-primary)',
                    fontSize: '15px'
                  }}
                >
                  <option value="none">None (Unpaid / Volunteer)</option>
                  <option value="salary">Fixed Weekly Salary</option>
                  <option value="piece_rate">Flat Rate Per Garment</option>
                  <option value="percentage">Percentage of Labor Cost</option>
                </select>
              </div>

              {editPayrollType !== 'none' && (
                <Input
                  label={
                    editPayrollType === 'salary' ? 'Weekly Amount' :
                    editPayrollType === 'piece_rate' ? 'Amount Per Garment' :
                    'Percentage (%)'
                  }
                  type="number"
                  placeholder={editPayrollType === 'percentage' ? 'e.g. 15' : 'e.g. 5000'}
                  value={editPayrollAmount}
                  onChange={(e) => setEditPayrollAmount(e.target.value)}
                />
              )}
            </div>

            <div className={styles.sheetActions} style={{ marginTop: '24px' }}>
              <Button variant="ghost" onClick={() => setSheetView('actions')}>Back</Button>
              <Button variant="primary" loading={savingEdit} onClick={handleSavePayroll}>Save</Button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className={styles.label}>Atelier Craft Specialization</label>
            <select
              value={newStaffCraftRole}
              onChange={(e) => setNewStaffCraftRole(e.target.value as AtelierCraftRole)}
              className={styles.selectInput}
            >
              <option value="cutter">Master Cutter (Pattern & Cutting Table)</option>
              <option value="tailor">Tailor / Machinist (Assembly & Sewing)</option>
              <option value="apprentice">Apprentice / Trainee (Finishing & Prep)</option>
              <option value="finisher">Finisher / Presser (Hemming & Steam)</option>
              <option value="embroiderer">Embroiderer (Monograms & Stitches)</option>
              <option value="general">General Artisan</option>
            </select>
          </div>
          {FEATURE_FLAGS.orgBranchMultiTenancy && (
            <>
              <label className={styles.label} htmlFor="new-staff-role">Administrative Role</label>
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
                <option value="Staff">Staff / Artisan</option>
                <option value="BranchManager">Branch Manager</option>
                <option value="Accountant">Accountant</option>
              </select>
            </>
          )}
          {addError && <p className={styles.errorText}>{addError}</p>}
          <Button type="submit" variant="primary" loading={addLoading}>Add Staff Member</Button>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={isUpsellOpen} onClose={() => setIsUpsellOpen(false)} title="Staff Accounts" variant="modal">
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
              router.push(ROUTES.settingsWithPlansSheet());
            }}
          >
            View Plans
          </Button>
        </div>
      </BottomSheet>
      
      <RunPayrollSheet 
        isOpen={isPayrollSheetOpen} 
        onClose={() => setIsPayrollSheetOpen(false)} 
        staffMembers={staffMembers}
        orders={orders}
        currency={currentShop?.currency || 'NGN'}
      />
    </PageLayout>
  );
}
