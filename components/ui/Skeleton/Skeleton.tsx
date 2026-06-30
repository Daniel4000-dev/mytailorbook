import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export default function Skeleton({ width = '100%', height = 16, borderRadius }: SkeletonProps) {
  return (
    <div
      className={styles.skeleton}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: borderRadius !== undefined
          ? (typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius)
          : undefined,
      }}
    />
  );
}
