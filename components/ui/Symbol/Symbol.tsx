import styles from './Symbol.module.css';

interface SymbolProps {
  /** Material Symbols icon name, e.g. "content_cut" */
  name: string;
  /** Render the filled variant */
  fill?: boolean;
  /** Font size in px (Material Symbols are square glyphs) */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Material Symbols icon — the icon system of the new design.
 * Renders from the self-hosted "Material Symbols Outlined" variable font;
 * `fill` flips the FILL axis for active/selected states.
 */
export default function Symbol({ name, fill = false, size = 24, className = '', style }: SymbolProps) {
  return (
    <span
      className={`material-symbols-outlined ${styles.symbol} ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: fill ? "'FILL' 1" : undefined,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
