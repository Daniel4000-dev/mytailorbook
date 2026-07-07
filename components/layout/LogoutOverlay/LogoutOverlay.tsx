import styles from './LogoutOverlay.module.css';

export default function LogoutOverlay() {
  return (
    <div className={styles.overlay}>
      <div className={styles.spinner} />
      <span className={styles.label}>Signing out…</span>
    </div>
  );
}
