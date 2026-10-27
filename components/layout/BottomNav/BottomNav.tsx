'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { NAV_ITEMS } from '@/lib/constants';
import CustomNavIcon from "@/components/ui/CustomNavIcon/CustomNavIcon";
import Avatar from '@/components/ui/Avatar/Avatar';
import styles from './BottomNav.module.css';

/** Must be a descendant of <Link> — useLinkStatus only reports the pending
 *  state of whichever Link it's nested inside. Highlighting on `pending`
 *  (not just the matched pathname) makes the tap feel instant instead of
 *  waiting for the route to actually finish committing.
 *
 *  `data-tour-id` lives on this div, not the parent <Link> — the Link
 *  has `display: contents` (.linkReset) so its own box collapses to
 *  nothing and generates no rect at all; AppTour's getBoundingClientRect
 *  needs the element that actually occupies space on screen. */
function NavItemContent({
  icon,
  label,
  isActive,
  tourId,
  hasActivity,
  isProfile,
  userAvatarUrl,
  userName,
}: {
  icon: string;
  label: string;
  isActive: boolean;
  tourId?: string;
  hasActivity?: boolean;
  isProfile?: boolean;
  userAvatarUrl?: string;
  userName?: string;
}) {
  const active = isActive;
  return (
    <div
      className={`${styles.item} ${active ? styles.active : ''} ${isProfile ? styles.profileItem : ''}`}
      data-tour-id={tourId}
      aria-label={label}
      title={label}
    >
      <div className={styles.iconWrapper}>
        {isProfile ? (
          <div className={`${styles.avatarWrapper} ${active ? styles.activeAvatar : ''}`}>
            <Avatar
              name={userName || 'Studio Master'}
              imageUrl={userAvatarUrl}
              size="xs"
              shape="circle"
              className={styles.navAvatar}
            />
          </div>
        ) : (
          <>
            <CustomNavIcon name={icon} fill={active} size={24} className={styles.icon} />
            {hasActivity && <div className={styles.activityDot} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isOwner, loading } = useAuth();
  const { currentShop, isLoaded } = useData();
  const [isCompact, setIsCompact] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const getMainScrollTop = (): number => {
      const main = document.querySelector('main');
      if (main && typeof main.scrollTop === 'number' && main.scrollHeight > main.clientHeight) {
        return main.scrollTop;
      }
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const handleScroll = (e?: Event) => {
      // If the scroll came from a nested horizontal scroller (e.g., fabric swatches, pills), ignore
      if (e?.target instanceof HTMLElement && e.target.tagName !== 'MAIN') {
        const target = e.target;
        if (target.scrollHeight <= target.clientHeight + 10 && target.scrollWidth > target.clientWidth) {
          return;
        }
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = getMainScrollTop();
          const delta = currentY - lastScrollY.current;

          // If near the top of the page, always stay full-size
          if (currentY < 30) {
            setIsCompact(false);
          } else if (delta > 8) {
            // Scrolling DOWN -> compact/scale down
            setIsCompact(true);
          } else if (delta < -5) {
            // Scrolling UP -> expand immediately
            setIsCompact(false);
          }

          lastScrollY.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    // Also capture at window level for any sub-container or document scroll
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    // Reset state on navigation
    setIsCompact(false);
    lastScrollY.current = getMainScrollTop();

    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [pathname]);

  // Owner-only items (e.g. Customers) depend on `isOwner`, which starts
  // false until the profile finishes loading — rendering before then would
  // show a shorter nav that visibly grows/shifts once the real role
  // resolves. Waiting the extra beat for a stable, correct-on-first-paint
  // nav reads far better than items jumping sideways under the user's thumb.
  if (loading || !isLoaded) return null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.hideFromBottomNav) return false;
    if (item.ownerOnly && !isOwner) return false;
    const mode = currentShop?.businessMode || 'bespoke';
    if (mode === 'bespoke' && item.rtwOnly) return false;
    if (mode === 'rtw' && item.bespokeOnly) return false;
    return true;
  });

  return (
    <nav
      className={`${styles.nav} ${isCompact ? styles.navCompact : ''}`}
      aria-label="Bottom Navigation"
      onMouseEnter={() => setIsCompact(false)}
      onTouchStart={() => setIsCompact(false)}
      onClick={() => setIsCompact(false)}
    >
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
        const isProfile = item.href === '/settings';
        return (
          <Link key={item.href} href={item.href} className={styles.linkReset} aria-label={item.label}>
            <NavItemContent
              icon={item.icon}
              label={item.label}
              isActive={isActive}
              tourId={item.tourId}
              hasActivity={item.label === "Production"}
              isProfile={isProfile}
              userAvatarUrl={user?.avatarUrl}
              userName={user?.name}
            />
          </Link>
        );
      })}
    </nav>
  );
}

