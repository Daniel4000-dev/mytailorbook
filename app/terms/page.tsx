import Link from 'next/link';
import type { Metadata } from 'next';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import { APP_CONFIG } from '@/lib/config';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN, PREMIUM_YEARLY_PRICE_NGN } from '@/lib/subscription';
import styles from './page.module.css';

// A real, legitimately public legal page — opts back in to indexing
// against the root layout's site-wide noindex default.
export const metadata: Metadata = {
  title: `Terms of Service — ${APP_CONFIG.name}`,
  description: `The terms that govern using ${APP_CONFIG.name}.`,
  robots: { index: true, follow: true },
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = 'August 1, 2026';
const OPERATOR_NAME = 'DVCH';
const CONTACT_EMAIL = 'support@mystitchbooks.com';

export default function TermsOfServicePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/login" className={styles.brand}>
          <BrandIcon className={styles.logo} />
          <span>{APP_CONFIG.name.toUpperCase()}</span>
        </Link>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>

        <p>
          These terms govern your use of {APP_CONFIG.name} (&quot;we,&quot; &quot;our,&quot; &quot;the platform&quot;) — a
          business-management tool for tailors and fashion studios. By creating an account or using the
          platform, you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.
        </p>

        <div className={styles.noticeBox}>
          <strong>An important distinction before you read further:</strong> {APP_CONFIG.name} is a tool
          your studio uses to run its business. Your relationship with your own customers — the orders you
          take, the prices you charge, the garments you deliver — is between you and them. We provide the
          software; we&apos;re not a party to that relationship. See Section 6 for what this means for your
          responsibilities as a studio owner.
        </div>

        <h2>1. Who We Are</h2>
        <p>
          {APP_CONFIG.name} is operated by {OPERATOR_NAME}. For any question about these terms, contact{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. For how we handle personal data, see our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>2. Accounts</h2>
        <h3>2.1 Eligibility</h3>
        <p>
          You must provide accurate information when creating an account and keep it up to date. You&apos;re
          responsible for keeping your login credentials confidential and for all activity that happens
          under your account.
        </p>
        <h3>2.2 Studio owners and staff</h3>
        <p>
          The person who creates a studio account (the Owner) is responsible for any staff accounts they
          add — including what those staff members do within the studio&apos;s data. Removing a staff member&apos;s
          access when they leave the studio is the Owner&apos;s responsibility.
        </p>

        <h2>3. Plans, Billing &amp; Cancellation</h2>
        <p>
          {APP_CONFIG.name} offers a Free plan and a paid Premium plan. Details of what each plan includes
          are shown in the app and may be updated from time to time.
        </p>
        <ul>
          <li>
            <strong>Free plan</strong> — unlimited customers and styles, up to {FREE_MONTHLY_ORDER_LIMIT} new
            orders per calendar month across your studio.
          </li>
          <li>
            <strong>Premium plan</strong> — ₦{PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}/month or ₦
            {PREMIUM_YEARLY_PRICE_NGN.toLocaleString()}/year, billed in advance through our payment
            processor, Paystack. Premium removes the order limit and unlocks staff accounts, analytics, and
            the other features shown in the app.
          </li>
          <li>
            Premium subscriptions renew automatically at the end of each billing period using the payment
            method on file, until you cancel.
          </li>
          <li>
            If a renewal payment fails, your studio keeps Premium features for a short grace period while we
            retry and remind you, after which it reverts to the Free plan&apos;s limits. Your data is never
            deleted or locked for a failed payment.
          </li>
          <li>
            You can cancel anytime from Settings. Cancelling stops future renewals; you keep Premium access
            through the end of the period you&apos;ve already paid for.
          </li>
          <li>
            Payments are processed by Paystack; we don&apos;t store your card details ourselves. Fees paid are
            generally non-refundable, including for partial billing periods, except where required by law.
          </li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the platform for anything unlawful, fraudulent, or to harm others.</li>
          <li>Attempt to access another studio&apos;s data, or bypass any access or billing controls.</li>
          <li>Interfere with the platform&apos;s normal operation (e.g. scripted abuse of shared infrastructure).</li>
          <li>Use the platform to send unsolicited or misleading communications to customers.</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these terms.</p>

        <h2>5. Your Content</h2>
        <p>
          You (and your studio&apos;s customers, through you) retain ownership of the data you enter into{' '}
          {APP_CONFIG.name} — customer records, measurements, order details, photos, and everything else.
          We store and process it to provide the service, as described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>. We don&apos;t claim ownership of your content and don&apos;t
          use it for anything beyond running the platform for you.
        </p>

        <h2>6. If You&apos;re a Studio Owner: Your Responsibilities</h2>
        <p>
          {APP_CONFIG.name} gives you tools to record and manage your customers&apos; information and run your
          business — it doesn&apos;t set the terms of your relationship with your customers. You&apos;re
          responsible for:
        </p>
        <ul>
          <li>The accuracy of orders, pricing, and information you record.</li>
          <li>Fulfilling the commitments you make to your own customers.</li>
          <li>Having a lawful basis to collect and store your customers&apos; personal information, and being transparent with them about it.</li>
          <li>Any disputes between you and your customers — these are yours to resolve, not ours.</li>
        </ul>

        <h2>7. Availability</h2>
        <p>
          We aim to keep {APP_CONFIG.name} reliable and available, but the platform is provided &quot;as is&quot;
          without guarantees of uninterrupted or error-free operation. We&apos;re not liable for losses caused
          by downtime, bugs, or issues with third-party services we rely on (payment processing, hosting,
          email delivery).
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, {APP_CONFIG.name} and {OPERATOR_NAME} are not liable for
          indirect, incidental, or consequential damages arising from your use of the platform, including
          lost revenue or lost data. Our total liability for any claim relating to the service is limited to
          the amount you paid us in the three months before the claim arose.
        </p>

        <h2>9. Termination</h2>
        <p>
          You may stop using {APP_CONFIG.name} and close your account at any time. We may suspend or
          terminate an account that violates these terms, or if required by law. On closure, your data is
          handled as described in our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>10. Changes to These Terms</h2>
        <p>
          If we make material changes to these terms, we&apos;ll update the &quot;Last updated&quot; date above.
          Continuing to use {APP_CONFIG.name} after changes take effect means you accept the updated terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria, without regard to
          conflict-of-law principles.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          Questions about these terms? Reach out to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p className={styles.disclaimer}>
          These terms are written to accurately describe how {APP_CONFIG.name} actually works. They are
          provided for general informational purposes and aren&apos;t a substitute for advice from a
          qualified lawyer, particularly before wider commercial launch.
        </p>

        <Link href="/login" className={styles.backLink}>← Back to {APP_CONFIG.name}</Link>
      </div>
    </div>
  );
}
