import Link from 'next/link';
import { APP_CONFIG } from '@/lib/config';
import styles from './page.module.css';

const LAST_UPDATED = 'July 6, 2026';
const CONTROLLER_NAME = 'Adekunle Daniel';
const CONTACT_EMAIL = 'dadekunle31@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/login" className={styles.brand}>
          <img src="/images/logo-mark.png" alt="" className={styles.logo} />
          <span>{APP_CONFIG.name.toUpperCase()}</span>
        </Link>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>

        <p>
          This policy explains how {APP_CONFIG.name} ("we," "our," "the platform") collects, uses,
          and protects information when you use our fashion-studio management software — whether
          you're a tailor/studio owner, a staff member they've added, or a customer of theirs
          tracking an order.
        </p>

        <div className={styles.noticeBox}>
          <strong>An important distinction before you read further:</strong> {APP_CONFIG.name} is a
          tool that tailors and studios use to run their business. If you're a studio owner, you
          enter information about your own customers — their name, phone number, body measurements,
          and order details — into the app. For that customer data, <em>you</em> (the studio) are the
          data controller under Nigerian law, and {APP_CONFIG.name} acts as your data processor,
          storing and securing it on your behalf. This policy covers both roles: what we collect and
          do as the platform, and what studio owners are responsible for regarding their own
          customers.
        </div>

        <h2>1. Who We Are</h2>
        <p>
          {APP_CONFIG.name} is operated by {CONTROLLER_NAME}. For any privacy question, request, or
          concern, contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>2. Information We Collect</h2>

        <h3>2.1 Account information (studio owners &amp; staff)</h3>
        <p>
          When you sign up or are added as staff, we collect your name, email address, and role
          (Owner or Staff). If you sign up with a password, it's stored and verified by our
          authentication provider (Supabase Auth) — we never see or store your plain-text password
          ourselves. If you sign in with Google, we receive your name and email address from Google;
          we don't receive your Google password.
        </p>

        <h3>2.2 Studio information</h3>
        <p>
          Your studio/shop name, phone number, and address — the details that appear on receipts and
          the order-tracking page you share with your customers.
        </p>

        <h3>2.3 Customer information (entered by studio owners)</h3>
        <p>
          Studios use {APP_CONFIG.name} to record their own customers': full name, WhatsApp/phone
          number, gender, body measurements, notes, order details, garment photos, and billing/payment
          amounts. This information is entered by the studio, not collected by us directly from the
          customer — see Section 8 on studio responsibilities.
        </p>

        <h3>2.4 Automatically collected information</h3>
        <p>
          Like most web applications, our hosting provider (Vercel) automatically logs standard
          technical data for security and reliability — IP address, browser type, and request
          timestamps. We don't run third-party advertising trackers or analytics on this app.
        </p>

        <h2>3. How We Use Information</h2>
        <ul>
          <li>To provide the core service — production tracking, customer records, measurements, billing, and the public order-tracking page.</li>
          <li>To authenticate you and keep your studio's data separate and secure from other studios.</li>
          <li>To send account-related emails — confirming your email address, or a password reset, when you request one.</li>
          <li>To maintain and improve the reliability and security of the platform.</li>
        </ul>
        <p>We do not sell personal information, and we do not use customer data for advertising.</p>

        <h2>4. Legal Basis for Processing</h2>
        <p>
          Where the Nigeria Data Protection Act 2023 (NDPA) applies, we process personal data on the
          following bases: performance of a contract (providing the service you signed up for),
          consent (e.g., when you choose to sign in with Google), and legitimate interest (keeping the
          platform secure and functioning correctly).
        </p>

        <h2>5. Who We Share Information With</h2>
        <p>
          We don't sell or rent personal information. We do rely on a small number of infrastructure
          providers to run the service, each of whom only processes data on our instructions:
        </p>
        <ul>
          <li><strong>Supabase</strong> — our database and authentication provider. All account data, studio data, customer records, and order information is stored here.</li>
          <li><strong>Vercel</strong> — hosts the application itself.</li>
          <li><strong>Resend</strong> — sends account-related emails (e.g., password resets), where configured.</li>
          <li><strong>Google</strong> — if you choose "Sign in with Google," Google authenticates your identity for us.</li>
        </ul>
        <p>
          We may also disclose information if required to do so by law, or to protect the rights,
          property, or safety of {APP_CONFIG.name}, our users, or others.
        </p>

        <h2>6. International Data Transfers</h2>
        <p>
          Our infrastructure providers (Supabase, Vercel) may store and process data on servers
          located outside Nigeria. Where this happens, we rely on those providers' own security and
          compliance commitments to protect your data in transit and at rest.
        </p>

        <h2>7. Data Security</h2>
        <p>
          Access to studio data is restricted at the database level — each studio can only ever read
          or write its own records, enforced by database security rules (not just app-level checks).
          Connections between your device and our servers are encrypted (HTTPS). No system is
          perfectly secure, but we take reasonable, industry-standard steps to protect the information
          in our care.
        </p>

        <h2>8. If You're a Studio Owner: Your Responsibilities</h2>
        <p>
          Because you enter your own customers' personal information — including sensitive details
          like body measurements — into {APP_CONFIG.name}, you are responsible for:
        </p>
        <ul>
          <li>Having a lawful basis (typically your customer's consent) to collect and store their information.</li>
          <li>Being transparent with your customers about how you use their data.</li>
          <li>Responding to your customers if they ask you to correct or delete their information — you can do this directly within the app.</li>
        </ul>

        <h2>9. Data Retention</h2>
        <p>
          We retain account and studio data for as long as your account remains active. If you close
          your account, we will delete or anonymize your data within a reasonable period, except where
          we're required to retain it for legal or accounting reasons.
        </p>

        <h2>10. Your Rights</h2>
        <p>Under the NDPA, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data, subject to legal retention requirements.</li>
          <li>Withdraw consent where processing is based on consent (e.g., disconnecting Google sign-in).</li>
        </ul>
        <p>
          To exercise any of these rights, contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>11. Cookies &amp; Sessions</h2>
        <p>
          We use a single essential cookie to keep you signed in securely between visits. We don't use
          cookies for advertising or cross-site tracking.
        </p>

        <h2>12. Children's Privacy</h2>
        <p>
          {APP_CONFIG.name} is a business tool intended for adults running or working in a tailoring
          studio. It is not directed at children, and we do not knowingly collect personal information
          from children.
        </p>

        <h2>13. Changes to This Policy</h2>
        <p>
          If we make material changes to this policy, we'll update the "Last updated" date above. We
          encourage you to review this page periodically.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          Questions about this policy or how your data is handled? Reach out to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p className={styles.disclaimer}>
          This policy is written to accurately describe how {APP_CONFIG.name} actually works. It is
          provided for general informational purposes and isn't a substitute for advice from a
          qualified lawyer, particularly before wider commercial launch.
        </p>

        <Link href="/login" className={styles.backLink}>← Back to {APP_CONFIG.name}</Link>
      </div>
    </div>
  );
}
