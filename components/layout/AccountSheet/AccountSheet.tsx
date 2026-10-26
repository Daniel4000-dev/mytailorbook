'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './AccountSheet.module.css';

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSheet({ isOpen, onClose }: AccountSheetProps) {
  const router = useRouter();
  const { user, isOwner, logout } = useAuth();
  const { currentShop, shops, activeBranchId, setActiveBranchId } = useData();
  const { preference, setPreference } = useTheme();

  const userInitial = user?.name?.charAt(0) || user?.email?.charAt(0) || 'A';
  const roleLabel = isOwner ? 'Atelier Owner' : (user?.role || 'Staff');

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleSignOut = () => {
    onClose();
    logout();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Account & Atelier">
      <div className={styles.sheetContent}>
        {/* 1. User Identity Card */}
        <div className={styles.profileBanner}>
          <div className={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                width={48}
                height={48}
                className={styles.avatarImage}
              />
            ) : (
              <span>{userInitial.toUpperCase()}</span>
            )}
            <span className={styles.onlineDot} title="Online & Connected" />
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userNameRow}>
              <span className={styles.userName}>
                {user?.name || user?.email?.split('@')[0] || 'Atelier Master'}
              </span>
              <span className={styles.roleBadge}>{roleLabel}</span>
            </div>
            <span className={styles.userEmail}>{user?.email || 'Active Session'}</span>
          </div>
        </div>

        {/* 2. Branch & Shop Switcher (if multi-branch organization) */}
        {FEATURE_FLAGS.orgBranchMultiTenancy && isOwner && shops && shops.length > 1 && (
          <div className={styles.branchSection}>
            <span className={styles.sectionEyebrow}>Active Branch</span>
            <div className={styles.branchSelectWrap}>
              <select
                className={styles.branchSelect}
                value={activeBranchId ?? ''}
                onChange={(e) => setActiveBranchId(e.target.value)}
                aria-label="Switch active atelier branch"
              >
                {shops.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.isPrimary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
              <Symbol name="expand_more" size={18} className={styles.branchSelectChevron} />
            </div>
          </div>
        )}

        {/* 3. Atelier Settings Link */}
        <button
          type="button"
          className={styles.settingsRow}
          onClick={() => handleNavigate('/settings')}
        >
          <div className={styles.settingsRowLeft}>
            <div className={styles.settingsIconWrap}>
              <Symbol name="settings" size={18} />
            </div>
            <div className={styles.settingsInfo}>
              <span className={styles.settingsTitle}>Settings</span>
              <span className={styles.settingsSub}>Studio profile, staff, and preferences</span>
            </div>
          </div>
          <Symbol name="chevron_right" size={18} className={styles.menuChevron} />
        </button>

        {/* 4. Appearance / Theme Segment */}
        <div className={styles.branchSection}>
          <span className={styles.sectionEyebrow}>Theme Preference</span>
          <div className={styles.themeSegment}>
            <button
              type="button"
              className={`${styles.themeBtn} ${preference === 'light' ? styles.themeBtnActive : ''}`}
              onClick={() => setPreference('light')}
            >
              <Symbol name="light_mode" size={15} />
              <span>Light</span>
            </button>
            <button
              type="button"
              className={`${styles.themeBtn} ${preference === 'dark' ? styles.themeBtnActive : ''}`}
              onClick={() => setPreference('dark')}
            >
              <Symbol name="dark_mode" size={15} />
              <span>Dark</span>
            </button>
            <button
              type="button"
              className={`${styles.themeBtn} ${preference === 'system' ? styles.themeBtnActive : ''}`}
              onClick={() => setPreference('system')}
            >
              <Symbol name="smartphone" size={15} />
              <span>Auto</span>
            </button>
          </div>
        </div>

        {/* 5. Sign Out Button */}
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleSignOut}
        >
          <Symbol name="logout" size={18} />
          <span>Sign Out of Atelier</span>
        </button>
      </div>
    </BottomSheet>
  );
}
