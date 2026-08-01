import Image from 'next/image';
import styles from './DesktopGate.module.css';

/** Temporary launch gate: blocks every page (in-app and public) above the
 *  mobile breakpoint behind a static message. Pure CSS — hidden by default,
 *  shown only via the media query in DesktopGate.module.css — so there's no
 *  JS/hydration involved and removing this is a one-line deletion later. */
export default function DesktopGate() {
  return (
    <div className={styles.overlay}>
      <Image src="/images/logo-mark.png" alt="" width={496} height={496} className={`${styles.logo} brandLogoAuto`} />
      <p className={styles.message}>Temporarily unavailable.</p>
      <p className={styles.submessage}>Access using a mobile device.</p>
    </div>
  );
}
