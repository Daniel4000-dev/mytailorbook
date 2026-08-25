import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './TemplatePicker.module.css';

/** One unified accent set — matches components/studio/PortfolioView/
 *  PortfolioTemplate.tsx's ACCENTS exactly, since there's only one public
 *  template now (see git history for the retired Modern/Editorial/
 *  Heritage split). A tailor personalizes color, not layout. */
export const ACCENTS = [
  { id: 'indigo', hex: '#4338CA' },
  { id: 'coral', hex: '#E8532A' },
  { id: 'emerald', hex: '#0F9960' },
  { id: 'amber', hex: '#B8860B' },
  { id: 'brass', hex: '#9C7A3C' },
  { id: 'olive', hex: '#6B7A3A' },
  { id: 'oxblood', hex: '#7A2E2E' },
  { id: 'slate', hex: '#3F4A5A' },
  { id: 'terracotta', hex: '#B85C38' },
  { id: 'sage', hex: '#7C9070' },
  { id: 'umber', hex: '#6E5240' },
  { id: 'plum', hex: '#6B3F5C' },
];

interface AccentPickerProps {
  accent: string;
  onSelectAccent: (accent: string) => void;
}

export default function TemplatePicker({ accent, onSelectAccent }: AccentPickerProps) {
  return (
    <div>
      <span className={styles.accentLabel}>Accent color</span>
      <div className={styles.swatchRow}>
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`${styles.swatch} ${accent === a.id ? styles.swatchActive : ''}`}
            style={{ background: a.hex }}
            aria-label={a.id}
            onClick={() => onSelectAccent(a.id)}
          >
            {accent === a.id && <Symbol name="check" size={14} className={styles.swatchCheck} />}
          </button>
        ))}
      </div>
    </div>
  );
}
