'use client';

import { FaPrint } from 'react-icons/fa6';
import styles from './PrintButton.module.css';

export default function PrintButton() {
  return (
    <button type="button" className={`${styles.printBtn} noPrint`} onClick={() => window.print()}>
      <FaPrint /> Print Receipt
    </button>
  );
}
