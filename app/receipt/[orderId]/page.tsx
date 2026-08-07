import type { Metadata } from 'next';
import Image from 'next/image';
import { getPublicOrderView } from '@/app/public-actions';
import { getBalanceOwed } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatCurrency, formatPhone } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
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
          <h2>Receipt Not Found</h2>
          <p>This order could not be located.</p>
        </div>
      </div>
    );
  }

  const { order, customer, shop } = view;
  const balanceOwed = getBalanceOwed(order);
  const issuedDate = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.actionsBar}>
        <ReceiptActions fileName={`receipt-${order.id.slice(-8).toUpperCase()}`} />
      </div>

      <div className={styles.card} id="receipt-card">
        <div className={styles.cardInner}>
          <header className={styles.header}>
            <div className={styles.brandRow}>
              {shop?.logoUrl && <Image src={shop.logoUrl} alt="" width={200} height={200} className={styles.brandLogo} />}
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
            <span className={styles.amountHeroValue}>{formatCurrency(order.totalBill, shop.currency)}</span>
            <span className={`${styles.statusPill} ${balanceOwed <= 0 ? styles.statusPillPaid : styles.statusPillDue}`}>
              {balanceOwed <= 0 ? 'Paid in Full' : `${formatCurrency(balanceOwed, shop.currency)} Balance Due`}
            </span>
          </div>

          <div className={styles.dividerDashed} />

          <section className={styles.billTo}>
            <span className={styles.sectionLabel}>Billed To</span>
            <span className={styles.customerName}>{order.customerName}</span>
            {customer && <span className={styles.customerPhone}>{formatPhone(customer.whatsappNumber)}</span>}
          </section>

          <div className={styles.dividerDashed} />

          <section className={styles.lineItemSection}>
            <span className={styles.sectionLabel}>Order</span>
            <table className={styles.lineItemTable}>
              <tbody>
                <tr>
                  <td className={styles.lineItemDesc}>
                    {order.orderDetails}
                    <span className={styles.lineItemMeta}>{STATUS_CONFIG[order.status].label}</span>
                  </td>
                  <td className={styles.amountCol}>{formatCurrency(order.totalBill, shop.currency)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className={styles.dividerDashed} />

          <table className={styles.billTable}>
            <tbody>
              <tr>
                <td>Total Bill</td>
                <td className={styles.amountCol}>{formatCurrency(order.totalBill, shop.currency)}</td>
              </tr>
              <tr>
                <td>Amount Paid</td>
                <td className={styles.amountCol}>{formatCurrency(order.depositPaid, shop.currency)}</td>
              </tr>
              <tr className={styles.balanceRow}>
                <td>Balance Due</td>
                <td className={styles.amountCol}>{formatCurrency(balanceOwed, shop.currency)}</td>
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
                        <td className={styles.amountCol}>{formatCurrency(p.amount, shop.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          <footer className={styles.footer}>
            <p>Thank you for choosing {shop?.name || APP_CONFIG.name}.</p>
            <p className={styles.poweredBy}>Powered by {APP_CONFIG.name}</p>
          </footer>
        </div>
        <div className={styles.perforatedEdge} />
      </div>
    </div>
  );
}
