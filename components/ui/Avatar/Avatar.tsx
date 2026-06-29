'use client';

import { getInitials } from '@/lib/formatters';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ name, size = 'md', className }: AvatarProps) {
  const cls = [styles.avatar, styles[size], className].filter(Boolean).join(' ');
  return <div className={cls}>{getInitials(name)}</div>;
}
