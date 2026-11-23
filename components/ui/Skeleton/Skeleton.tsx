import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  className,
  style,
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: borderRadius !== undefined
          ? (typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius)
          : undefined,
        ...style,
      }}
    />
  );
}

