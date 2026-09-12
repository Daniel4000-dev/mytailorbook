'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
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
function NavItemContent({ icon, label, isActive, tourId }: { icon: string; label: string; isActive: boolean; tourId?: string }) {
  const { pending } = useLinkStatus();
  const active = isActive || pending;
  return (
    <div className={`${styles.item} ${active ? styles.active : ''}`} data-tour-id={tourId}>
      <Symbol name={icon} fill={active} size={24} className={styles.icon} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { isOwner, loading } = useAuth();

  // Owner-only items (e.g. Customers) depend on `isOwner`, which starts
  // false until the profile finishes loading — rendering before then would
  // show a shorter nav that visibly grows/shifts once the real role
  // resolves. Waiting the extra beat for a stable, correct-on-first-paint
  // nav reads far better than items jumping sideways under the user's thumb.
  if (loading) return null;

  const visibleItems = NAV_ITEMS.filter((item) => (!item.ownerOnly || isOwner) && !item.hideFromBottomNav);

  return (
    <nav className={styles.nav}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} className={styles.linkReset}>
            <NavItemContent icon={item.icon} label={item.label} isActive={isActive} tourId={item.tourId} />
          </Link>
        );
      })}
    </nav>
  );
}
