'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { FaBars, FaUserPlus, FaUsers, FaArrowRight, FaGear, FaPen, FaUserSlash, FaUserCheck, FaStore } from 'react-icons/fa6';
import { useSidebar } from '@/contexts/SidebarContext';
import { formatPhone } from '@/lib/formatters';
import SettingsSkeleton from './SettingsSkeleton';
import styles from './page.module.css';

export default function SettingsPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { staffMembers, addStaff, updateStaff, currentShop, updateShop, isLoaded } = useData();
  const { toggleMenu } = useSidebar();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCommissionRate, setEditCommissionRate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [editingShop, setEditingShop] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [savingShop, setSavingShop] = useState(false);

  // Auth still resolving — show the skeleton, not "Access Denied". `isOwner`
  // is derived from `user`, which starts null before the session check
  // finishes, so checking it first would incorrectly deny a real owner for
  // a brief instant on every load.
  if (authLoading || !isLoaded) {
    return (
      <PageLayout
        className={styles.pageGrid}
        header={
          <TopBar
            profileMode={{
              greeting: 'Studio Settings',
              name: user?.name || 'Owner',
              avatarInitials: user?.name ? user.name[0] : 'O',
            }}
            leftAction={
              <div className={styles.mobileOnly}>
                <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
              </div>
            }
          />
        }
      >
        <SettingsSkeleton />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sf-text-secondary)' }}>
          <h2>Access Denied</h2>
          <p>Only the studio owner has access to Settings.</p>
        </div>
      </PageLayout>
    );
  }

  const startEditStaff = (staff: { uid: string; name: string; commissionRate?: number }) => {
    setEditingUid(staff.uid);
    setEditName(staff.name);
    setEditCommissionRate(staff.commissionRate !== undefined ? String(staff.commissionRate) : '');
  };

  const handleSaveStaffEdit = async (uid: string) => {
    setSavingEdit(true);
    try {
      await updateStaff(uid, {
        name: editName,
        commissionRate: editCommissionRate ? parseFloat(editCommissionRate) : undefined,
      });
      setEditingUid(null);
      showToast('Staff member updated', 'success');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (uid: string, currentlyActive: boolean) => {
    await updateStaff(uid, { active: !currentlyActive });
    showToast(currentlyActive ? 'Staff member deactivated' : 'Staff member reactivated', 'success');
  };

  const startEditShop = () => {
    setShopName(currentShop?.name || '');
    setShopPhone(currentShop?.phone || '');
    setShopAddress(currentShop?.address || '');
    setEditingShop(true);
  };

  const handleSaveShop = async () => {
    setSavingShop(true);
    try {
      await updateShop({ name: shopName, phone: shopPhone || undefined, address: shopAddress || undefined });
      setEditingShop(false);
      showToast('Studio profile updated', 'success');
    } finally {
      setSavingShop(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await addStaff(name, email, password);
      setName('');
      setEmail('');
      setPassword('');
      showToast(`${name} added as staff`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add staff member.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      className={styles.pageGrid}
      header={
        <TopBar
          profileMode={{
            greeting: "Studio Settings",
            name: user?.name || "Owner",
            avatarInitials: user?.name ? user.name[0] : "O"
          }}
          leftAction={
            <div className={styles.mobileOnly}>
              <CircleIconButton
                icon={<FaBars />}
                onClick={toggleMenu}
                ariaLabel="Open menu"
              />
            </div>
          }
        />
      }
    >
      <div className={styles.container}>
        {/* Personal Details Card */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Account Profile</h3>
          <div className={styles.card}>
            <div className={styles.profileRow}>
              <div className={styles.avatarLarge}>
                {user?.name ? user.name[0] : 'O'}
              </div>
              <div className={styles.profileInfo}>
                <h4 className={styles.profileName}>{user?.name}</h4>
                <p className={styles.profileRole}>{user?.role} Account</p>
                <p className={styles.profileEmail}>{user?.email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Studio / Shop Profile Card — this is what appears on receipts and the customer tracking page */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaStore className={styles.sectionIcon} /> Studio Profile
          </h3>
          <div className={styles.card}>
            {editingShop ? (
              <div className={styles.form}>
                <Input label="Shop / Studio Name" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                <Input label="Phone (shown on receipts)" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="08012345678" />
                <Input label="Address" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Shop address" />
                <div className={styles.staffEditActions}>
                  <Button variant="ghost" size="sm" onClick={() => setEditingShop(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" loading={savingShop} onClick={handleSaveShop}>Save</Button>
                </div>
              </div>
            ) : (
              <div className={styles.profileRow}>
                <div className={styles.avatarLarge}>
                  <FaStore />
                </div>
                <div className={styles.profileInfo}>
                  <h4 className={styles.profileName}>{currentShop?.name || 'Unnamed Studio'}</h4>
                  {currentShop?.phone && <p className={styles.profileEmail}>{formatPhone(currentShop.phone)}</p>}
                  {currentShop?.address && <p className={styles.profileEmail}>{currentShop.address}</p>}
                  <p className={styles.profileRole}>This name appears on customer receipts &amp; tracking pages</p>
                </div>
                <button type="button" className={styles.staffActionBtn} style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={startEditShop} aria-label="Edit studio profile">
                  <FaPen />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Staff Directory Card */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaUsers className={styles.sectionIcon} /> Active Staff ({staffMembers.length})
          </h3>
          <div className={styles.card}>
            <div className={styles.staffList}>
              {staffMembers.map((staff) => {
                const isActive = staff.active !== false;
                const isEditing = editingUid === staff.uid;
                return (
                  <div key={staff.uid} className={`${styles.staffItem} ${!isActive ? styles.staffItemInactive : ''}`}>
                    <div className={styles.avatarCircle}>
                      {staff.name[0]}
                    </div>
                    {isEditing ? (
                      <div className={styles.staffEditForm}>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" />
                        {staff.role === 'Staff' && (
                          <Input
                            value={editCommissionRate}
                            onChange={(e) => setEditCommissionRate(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="Commission rate % (optional)"
                            inputMode="decimal"
                          />
                        )}
                        <div className={styles.staffEditActions}>
                          <Button variant="ghost" size="sm" onClick={() => setEditingUid(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" loading={savingEdit} onClick={() => handleSaveStaffEdit(staff.uid)}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.staffInfo}>
                          <span className={styles.staffName}>
                            {staff.name}
                            {!isActive && <span className={styles.inactiveBadge}>Inactive</span>}
                          </span>
                          <span className={styles.staffRole}>
                            {staff.role} ({staff.email})
                            {staff.commissionRate !== undefined && ` · ${staff.commissionRate}% commission`}
                          </span>
                        </div>
                        {staff.role === 'Staff' && (
                          <div className={styles.staffActions}>
                            <button type="button" className={styles.staffActionBtn} onClick={() => startEditStaff(staff)} aria-label="Edit staff">
                              <FaPen />
                            </button>
                            <button
                              type="button"
                              className={styles.staffActionBtn}
                              onClick={() => handleToggleActive(staff.uid, isActive)}
                              aria-label={isActive ? 'Deactivate staff' : 'Reactivate staff'}
                              title={isActive ? 'Deactivate' : 'Reactivate'}
                            >
                              {isActive ? <FaUserSlash /> : <FaUserCheck />}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Add Staff Form Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaUserPlus className={styles.sectionIcon} /> Register Employee
          </h3>
          <div className={styles.card}>
            <form onSubmit={handleAddStaff} className={styles.form}>
              <Input
                label="Full Name"
                placeholder="e.g. Chioma Eze"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Email/Username"
                type="email"
                placeholder="e.g. chioma@mytailorbook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {message && <p className={styles.errorText}>{message}</p>}

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className={styles.submitBtn}
              >
                Add Staff Member
              </Button>
            </form>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
