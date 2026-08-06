'use client';


import styles from './StatCard.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

const ICON_MAP: Record<string, React.ReactNode> = {
  FaScissors: <Symbol name="content_cut" />,
  FaGears: <Symbol name="settings" />,
  FaCheck: <Symbol name="check" />,
  FaCircleCheck: <Symbol name="check_circle" />,
  FaChartLine: <Symbol name="bar_chart" />,
  FaMoneyBill: <Symbol name="payments" />,
  FaUsers: <Symbol name="group" />,
  FaBoxesStacked: <Symbol name="inventory_2" />,
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  accentColor?: string;
}

export default function StatCard({ label, value, icon, accentColor }: StatCardProps) {
  const iconElement = ICON_MAP[icon] || <Symbol name="bar_chart" />;

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
