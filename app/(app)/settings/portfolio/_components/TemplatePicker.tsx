import Symbol from '@/components/ui/Symbol/Symbol';
import type { Shop } from '@/lib/types';
import styles from './TemplatePicker.module.css';

type Template = Shop['portfolioTemplate'];

export const TEMPLATE_ACCENTS: Record<Template, { id: string; hex: string }[]> = {
  modern: [
    { id: 'indigo', hex: '#4338CA' },
    { id: 'coral', hex: '#E8532A' },
    { id: 'emerald', hex: '#0F9960' },
    { id: 'amber', hex: '#B8860B' },
  ],
  editorial: [
    { id: 'brass', hex: '#8B6F47' },
    { id: 'olive', hex: '#6B7B5E' },
    { id: 'oxblood', hex: '#8A4A4A' },
    { id: 'slate', hex: '#4A5C6B' },
    { id: 'indigo', hex: '#4338CA' },
  ],
  heritage: [
    { id: 'terracotta', hex: '#B4552E' },
    { id: 'sage', hex: '#5B7A6B' },
    { id: 'umber', hex: '#8A6C46' },
    { id: 'plum', hex: '#6B5B7A' },
  ],
};

export const TEMPLATE_DEFAULT_ACCENT: Record<Template, string> = {
  modern: 'indigo',
  editorial: 'brass',
  heritage: 'terracotta',
};

const TEMPLATES: { id: Template; title: string; description: string }[] = [
  { id: 'modern', title: 'Bold & Modern', description: 'Punchy colors, a confident photo grid.' },
  { id: 'editorial', title: 'Elevated & Cinematic', description: 'Full-bleed photography, quiet luxury.' },
  { id: 'heritage', title: 'Warm & Personal', description: "A story-first journey, family-run feel." },
];

interface TemplatePickerProps {
  template: Template;
  accent: string;
  onSelectTemplate: (template: Template) => void;
  onSelectAccent: (accent: string) => void;
}

export default function TemplatePicker({ template, accent, onSelectTemplate, onSelectAccent }: TemplatePickerProps) {
  const accents = TEMPLATE_ACCENTS[template];

  return (
    <div>
      <div className={styles.cards}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.card} ${template === t.id ? styles.cardActive : ''}`}
            onClick={() => onSelectTemplate(t.id)}
          >
            <span className={styles.cardTitle}>
              {t.title}
              {template === t.id && <Symbol name="check_circle" size={16} className={styles.cardCheck} />}
            </span>
            <span className={styles.cardDesc}>{t.description}</span>
          </button>
        ))}
      </div>

      <span className={styles.accentLabel}>Accent color</span>
      <div className={styles.swatchRow}>
        {accents.map((a) => (
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
