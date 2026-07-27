'use client';

import { getInitials } from '@/lib/formatters';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const cls = [styles.avatar, styles[size], className].filter(Boolean).join(' ');
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} className={`${cls} ${styles.image}`} />;
  }
  return <div className={cls}>{getInitials(name)}</div>;
}
