import { getDatabase } from '@/app/actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency, formatPhone } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import PrintButton from '@/components/receipt/PrintButton';
import styles from './page.module.css';

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const db = await getDatabase();
  const order = db.orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h2>Receipt Not Found</h2>
          <p>This order could not be located.</p>
        </div>
      </div>
    );
  }

  const customer = db.customers.find((c) => c.id === order.customerId);
  const shop = db.shops?.find((s) => s.id === order.shopId);
  const balanceOwed = getBalanceOwed(order);
  const issuedDate = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.actionsBar}>
        <PrintButton />
      </div>

      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.brand}>{shop?.name || APP_CONFIG.name}</h1>
            {shop?.phone && <span className={styles.brandSub}>{formatPhone(shop.phone)}</span>}
            {shop?.address && <span className={styles.brandSub}>{shop.address}</span>}
          </div>
          <div className={styles.receiptMeta}>
            <span className={styles.receiptLabel}>RECEIPT</span>
            <span className={styles.receiptId}>#{order.id.slice(-8).toUpperCase()}</span>
            <span className={styles.receiptDate}>{issuedDate}</span>
          </div>
        </header>

        <div className={styles.divider} />

        <section className={styles.billTo}>
          <span className={styles.sectionLabel}>Billed To</span>
          <span className={styles.customerName}>{order.customerName}</span>
          {customer && <span className={styles.customerPhone}>{formatPhone(customer.whatsappNumber)}</span>}
        </section>

        <section className={styles.itemSection}>
          <span className={styles.sectionLabel}>Order Details</span>
          <p className={styles.orderDetails}>{order.orderDetails}</p>
          <span className={styles.orderStatus}>Status: {order.status}</span>
        </section>

        <div className={styles.divider} />

        <table className={styles.billTable}>
          <tbody>
            <tr>
              <td>Total Bill</td>
              <td className={styles.amountCol}>{formatCurrency(order.totalBill)}</td>
            </tr>
            <tr>
              <td>Amount Paid</td>
              <td className={styles.amountCol}>{formatCurrency(order.depositPaid)}</td>
            </tr>
            <tr className={styles.balanceRow}>
              <td>Balance Due</td>
              <td className={styles.amountCol}>{formatCurrency(balanceOwed)}</td>
            </tr>
          </tbody>
        </table>

        {order.payments && order.payments.length > 0 && (
          <>
            <div className={styles.divider} />
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
                      <td className={styles.amountCol}>{formatCurrency(p.amount)}</td>
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
    </div>
  );
}
