'use client';

import { FaScissors, FaGears, FaCheck, FaCircleCheck, FaChartLine, FaMoneyBill, FaUsers, FaBoxesStacked } from 'react-icons/fa6';
import styles from './StatCard.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  FaScissors: <FaScissors />,
  FaGears: <FaGears />,
  FaCheck: <FaCheck />,
  FaCircleCheck: <FaCircleCheck />,
  FaChartLine: <FaChartLine />,
  FaMoneyBill: <FaMoneyBill />,
  FaUsers: <FaUsers />,
  FaBoxesStacked: <FaBoxesStacked />,
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  accentColor?: string;
}

export default function StatCard({ label, value, icon, accentColor }: StatCardProps) {
  const iconElement = ICON_MAP[icon] || <FaChartLine />;

  return (
    <div className={styles.card}>
      <div
        className={styles.iconWrap}
        style={accentColor ? { background: `${accentColor}20`, color: accentColor } : undefined}
      >
        {iconElement}
      </div>
      <div className={styles.info}>
        <span className={styles.value} style={accentColor ? { color: accentColor } : undefined}>
          {value}
        </span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
