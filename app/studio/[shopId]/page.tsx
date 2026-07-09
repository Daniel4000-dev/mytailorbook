import { FaStar, FaWhatsapp, FaLocationDot, FaLock } from 'react-icons/fa6';
import { getPublicPortfolioView } from '@/app/public-actions';
import { getWhatsAppLink, formatPhone } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import styles from './page.module.css';

export default async function StudioPortfolioPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const view = await getPublicPortfolioView(shopId);

  if (!view) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Studio Not Found</h2>
          <p className={styles.errorText}>Please double-check this link.</p>
        </div>
      </div>
    );
  }

  const { shop, photos, ratingAverage, ratingCount } = view;

  return (
    <div className={styles.page}>
      <header className={styles.stickyHeader}>
        <div className={styles.brandBlock}>
          <span className={styles.brandName}>{APP_CONFIG.name.toUpperCase()}</span>
          <span className={styles.brandDomain}>{APP_CONFIG.domain}</span>
        </div>
      </header>

      <div className={styles.scrollContent}>
        <section className={styles.heroCard}>
          <h1 className={styles.shopName}>{shop.name}</h1>
          {shop.tagline && <p className={styles.tagline}>{shop.tagline}</p>}

          <div className={styles.metaRow}>
            {ratingAverage !== null && (
              <span className={styles.ratingPill}>
                <FaStar /> {ratingAverage.toFixed(1)} <span className={styles.ratingCount}>({ratingCount} review{ratingCount === 1 ? '' : 's'})</span>
              </span>
            )}
            {shop.address && (
              <span className={styles.addressPill}>
                <FaLocationDot /> {shop.address}
              </span>
            )}
          </div>

          {shop.bio && <p className={styles.bio}>{shop.bio}</p>}

          {shop.phone && (
            <a href={getWhatsAppLink(shop.phone)} target="_blank" rel="noopener noreferrer" className={styles.contactBtn}>
              <FaWhatsapp /> Message {shop.name} on WhatsApp
            </a>
          )}
        </section>

        {photos.length > 0 && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Our Work</h3>
            <div className={styles.photoGrid}>
              {photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photo.id} src={photo.url} alt={photo.caption || `${shop.name}'s work`} className={styles.photoThumb} />
              ))}
            </div>
          </section>
        )}

        {shop.phone && (
          <div className={styles.footerContact}>
            <span className={styles.footerLabel}>Contact</span>
            <span className={styles.footerPhone}>{formatPhone(shop.phone)}</span>
          </div>
        )}

        <footer className={styles.trackerFooter}>
          <p>© {new Date().getFullYear()} {shop.name}</p>
          <span className={styles.lockBadge}>
            <FaLock /> Powered by {APP_CONFIG.name}
          </span>
        </footer>
      </div>
    </div>
  );
}
