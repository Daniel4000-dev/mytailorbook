'use client';

import Image from 'next/image';
import { getInitials } from '@/lib/formatters';
import styles from './Avatar.module.css';

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = { sm: 32, md: 40, lg: 56, xl: 80 };

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const cls = [styles.avatar, styles[size], className].filter(Boolean).join(' ');
  if (imageUrl) {
    const px = SIZE_PX[size];
    return <Image src={imageUrl} alt={name} width={px} height={px} className={`${cls} ${styles.image}`} />;
  }
  return <div className={cls}>{getInitials(name)}</div>;
}
