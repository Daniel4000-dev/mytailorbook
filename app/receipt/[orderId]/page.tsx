import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getPublicOrderView } from '@/app/public-actions';
import { getBalanceOwed } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatCurrency, formatPhone, getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES } from '@/lib/routes';
import { getWorkshopCrestDataUrl } from '@/lib/receipt';
import ReceiptActions from './_components/ReceiptActions';
import styles from './page.module.css';

// Private-by-link customer page (real names, financials) — must never
// show up in search results even though it's technically public/unauthed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const view = await getPublicOrderView(orderId);

  if (!view) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardInner} style={{ textAlign: 'center' }}>
            <h2>Receipt Not Found</h2>
            <p style={{ marginTop: '8px', color: 'var(--receipt-muted)' }}>
              This order receipt could not be located. Please check the link or contact your tailor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { order, customer, shop } = view;
  const balanceOwed = getBalanceOwed(order);
  const issuedDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const clientStageLabel =
    {
      Documented: 'Order Confirmed',
      Cutting: 'Fabric & Cutting',
      Sewing: 'Tailoring & Stitching',
      Ready: 'Ready for Collection',
      Delivered: 'Completed & Received',
    }[order.status] || STATUS_CONFIG[order.status]?.label || order.status;

  return (
    <div className={styles.page}>
      <div className={`${styles.actionsBar} noPrint`}>
        <Link href={ROUTES.track(order)} className={styles.trackPill}>
          <Symbol name="visibility" size={16} />
          <span>Track Garment</span>
        </Link>
        <ReceiptActions fileName={`receipt-${order.id.slice(-8).toUpperCase()}`} />
      </div>

      <div className={styles.card} id="receipt-card">
        {/* Top Scalloped Perforation */}
        <div className={styles.receiptPerforationTop} aria-hidden="true">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} className={styles.perforationHoleTop} />
          ))}
        </div>

        <div className={styles.cardInner}>
          <header className={styles.header}>
            <div className={styles.brandRow}>
              <img
                src={shop?.logoUrl || getWorkshopCrestDataUrl(shop?.name)}
                alt=""
                width={44}
                height={44}
                className={styles.brandLogo}
              />
              <div>
                <h1 className={styles.brand}>{shop?.name || APP_CONFIG.name}</h1>
                {shop?.phone && <span className={styles.brandSub}>{formatPhone(shop.phone)}</span>}
                {shop?.address && <span className={styles.brandSub}>{shop.address}</span>}
              </div>
            </div>
            <div className={styles.receiptMeta}>
              <span className={styles.receiptLabel}>Receipt</span>
              <span className={styles.receiptId}>#{order.id.slice(-8).toUpperCase()}</span>
              <span className={styles.receiptDate}>{issuedDate}</span>
            </div>
          </header>

          <div className={styles.amountHero}>
            <span className={styles.amountHeroLabel}>Total Bill</span>
            <span className={styles.amountHeroValue}>{formatCurrency(order.totalBill, shop?.currency)}</span>
            <span className={`${styles.statusPill} ${balanceOwed <= 0 ? styles.statusPillPaid : styles.statusPillDue}`}>
              {balanceOwed <= 0 ? 'Paid in Full' : `${formatCurrency(balanceOwed, shop?.currency)} Balance Due`}
            </span>
          </div>

          <div className={styles.dividerDashed} />

          <section className={styles.billTo}>
            <span className={styles.sectionLabel}>Billed To</span>
            <span className={styles.customerName}>{order.customerName}</span>
            {customer &&
              customer.whatsappNumber &&
              !customer.whatsappNumber.startsWith('000000000') &&
              !customer.whatsappNumber.startsWith('23400') && (
                <span className={styles.customerPhone}>{formatPhone(customer.whatsappNumber)}</span>
              )}
          </section>

          <div className={styles.dividerDashed} />

          <section className={styles.lineItemSection}>
            <span className={styles.sectionLabel}>Order</span>
            <table className={styles.lineItemTable}>
              <tbody>
                <tr>
                  <td className={styles.lineItemDesc}>
                    {order.orderDetails}
                    <span className={styles.lineItemMeta}>{clientStageLabel}</span>
                  </td>
                  <td className={styles.amountCol}>{formatCurrency(order.totalBill, shop?.currency)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className={styles.dividerDashed} />

          <table className={styles.billTable}>
            <tbody>
              <tr>
                <td>Total Bill</td>
                <td className={styles.amountCol}>{formatCurrency(order.totalBill, shop?.currency)}</td>
              </tr>
              <tr>
                <td>Amount Paid</td>
                <td className={styles.amountCol}>{formatCurrency(order.depositPaid, shop?.currency)}</td>
              </tr>
              <tr className={styles.balanceRow}>
                <td>Balance Due</td>
                <td className={styles.amountCol}>{formatCurrency(balanceOwed, shop?.currency)}</td>
              </tr>
            </tbody>
          </table>

          {order.payments && order.payments.length > 0 && (
            <>
              <div className={styles.dividerDashed} />
              <section className={styles.paymentSection}>
                <span className={styles.sectionLabel}>Payment History</span>
                <table className={styles.paymentTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Recorded By</th>
                      <th className={styles.amountCol}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.timestamp).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>{p.recordedByName}</td>
                        <td className={styles.amountCol}>{formatCurrency(p.amount, shop?.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          <footer className={styles.footer}>
            <p>Thank you for choosing {shop?.name || APP_CONFIG.name}.</p>
            {shop?.phone && (
              <p className={styles.workshopContact}>
                <a
                  href={getWhatsAppLink(
                    shop.phone,
                    `Hello ${shop.name || APP_CONFIG.name}, I have a question regarding my receipt for order #${order.id.slice(-8).toUpperCase()}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.waLink}
                >
                  <Symbol name="chat" size={14} /> Contact Tailor on WhatsApp
                </a>
              </p>
            )}

            <div className={styles.dualBrandFooter}>
              <div className={styles.dualBrandHeader}>
                <div className={styles.dualBrandPlatform}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" rx="6" fill="#4F46E5" />
                    <path d="M6 7H11V17H6V7Z" fill="#FFFFFF" fillOpacity="0.9" />
                    <path d="M13 7H18V17H13V7Z" fill="#FFFFFF" fillOpacity="0.9" />
                    <circle cx="12" cy="12" r="2.2" fill="#10B981" />
                  </svg>
                  <span className={styles.platformName}>MyTailorBook</span>
                </div>
                <div className={styles.verifiedBadge}>
                  <Symbol name="verified" size={12} className={styles.verifiedCheck} />
                  <span>Verified Bespoke Receipt</span>
                </div>
              </div>
              <p className={styles.dualBrandLegal}>
                Issued by {shop?.name || 'the workshop'} via MyTailorBook. Official record of bespoke garment specifications and verified payments.
              </p>
            </div>
          </footer>
        </div>

        {/* Bottom Scalloped Perforation */}
        <div className={styles.receiptPerforationBottom} aria-hidden="true">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} className={styles.perforationHoleBottom} />
          ))}
        </div>
      </div>
    </div>
  );
}
