import Symbol from '@/components/ui/Symbol/Symbol';
import { APP_CONFIG } from '@/lib/config';
import styles from './PreferredSourceBadge.module.css';

/** Google's "Preferred Sources" feature — a reader who follows a site
 *  through this link gets more of its content surfaced in Search,
 *  Discover, and (as of the 2026 rollout) AI Overview citations. The
 *  deep link format (google.com/preferences/source?q=domain) isn't
 *  officially documented by Google as of this writing, only reported
 *  consistently across SEO coverage of the feature — flagged here in
 *  case Google changes it. */
export default function PreferredSourceBadge({ className }: { className?: string }) {
  return (
    <a
      href={`https://www.google.com/preferences/source?q=${APP_CONFIG.domain}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.badge} ${className ?? ''}`}
    >
      <Symbol name="add_circle" size={16} />
      Follow on Google
    </a>
  );
}
