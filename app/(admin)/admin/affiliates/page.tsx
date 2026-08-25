import { getAffiliatePerformance } from '@/lib/admin/queries';
import AffiliateForm from './AffiliateForm';
import AffiliateToggle from './AffiliateToggle';
import AffiliateName from './AffiliateName';
import styles from './page.module.css';

export default async function AffiliatesPage() {
  const affiliates = await getAffiliatePerformance();

  return (
    <div>
      <h1 className={styles.heading}>Affiliates</h1>
      <p className={styles.subheading}>
        Share a signup link as <code>?ref=CODE</code>. Attribution is first-touch and stored on the shop&apos;s organization
        at signup.
      </p>

      <AffiliateForm />

      {!affiliates || affiliates.length === 0 ? (
        <p className={styles.empty}>No affiliates yet — add one above.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Signups</th>
                <th>Premium conversions</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id}>
                  <td>
                    <AffiliateName id={affiliate.id} name={affiliate.name} />
                  </td>
                  <td>
                    <code>{affiliate.code}</code>
                  </td>
                  <td>{affiliate.signups}</td>
                  <td>{affiliate.premiumConversions}</td>
                  <td>{affiliate.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <AffiliateToggle id={affiliate.id} active={affiliate.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
