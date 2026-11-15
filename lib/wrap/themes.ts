import { StitchWrapTheme, WrapThemeId, StitchWrapArchetype } from './types';

export const WRAP_THEMES: Record<WrapThemeId, StitchWrapTheme> = {
  heritage_emerald: {
    id: 'heritage_emerald',
    name: 'Royal Heritage Emerald',
    auraTitle: 'Noble Sovereign Aura',
    paletteDescription: 'Deep forest emerald, ceremonial jade, and antique champagne gold accents.',
    primaryGradient: 'linear-gradient(160deg, #022c22 0%, #064e3b 45%, #052e16 80%, #021f14 100%)',
    backgroundSurface: '#042f2e',
    accentColor: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    textColor: '#f0fdf4',
    textMuted: '#a7f3d0',
    cardBorder: 'rgba(52, 211, 153, 0.35)',
    tagBackground: 'rgba(16, 185, 129, 0.18)',
    blobColor1: 'rgba(16, 185, 129, 0.35)',
    blobColor2: 'rgba(234, 179, 8, 0.25)',
    blobColor3: 'rgba(5, 150, 105, 0.3)',
    laserColor: '#34d399',
    glassBorder: 'rgba(52, 211, 153, 0.25)',
  },

  bespoke_obsidian: {
    id: 'bespoke_obsidian',
    name: 'Sartorial Obsidian & Gold',
    auraTitle: 'Master Tailor Aura',
    paletteDescription: 'Midnight tuxedo obsidian, tailored graphite, and 24K bespoke brass gold.',
    primaryGradient: 'linear-gradient(160deg, #09090b 0%, #18181b 45%, #27272a 80%, #0c0a09 100%)',
    backgroundSurface: '#0f0f11',
    accentColor: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    textColor: '#fafaf9',
    textMuted: '#d6d3d1',
    cardBorder: 'rgba(245, 158, 11, 0.35)',
    tagBackground: 'rgba(245, 158, 11, 0.18)',
    blobColor1: 'rgba(245, 158, 11, 0.35)',
    blobColor2: 'rgba(217, 119, 6, 0.25)',
    blobColor3: 'rgba(120, 113, 108, 0.3)',
    laserColor: '#fbbf24',
    glassBorder: 'rgba(245, 158, 11, 0.25)',
  },

  couture_amethyst: {
    id: 'couture_amethyst',
    name: 'Couture Amethyst & Rose',
    auraTitle: 'Haute Luminary Aura',
    paletteDescription: 'Imperial royal violet, deep plum velvet, and champagne rose gold shimmer.',
    primaryGradient: 'linear-gradient(160deg, #2e1065 0%, #3b0764 45%, #4c0519 80%, #1f0438 100%)',
    backgroundSurface: '#1e053a',
    accentColor: '#f43f5e',
    accentGlow: 'rgba(244, 63, 94, 0.45)',
    textColor: '#fff1f2',
    textMuted: '#fecdd3',
    cardBorder: 'rgba(244, 63, 94, 0.35)',
    tagBackground: 'rgba(244, 63, 94, 0.18)',
    blobColor1: 'rgba(244, 63, 94, 0.35)',
    blobColor2: 'rgba(168, 85, 247, 0.3)',
    blobColor3: 'rgba(251, 113, 133, 0.25)',
    laserColor: '#fb7185',
    glassBorder: 'rgba(244, 63, 94, 0.25)',
  },

  speedster_sapphire: {
    id: 'speedster_sapphire',
    name: 'Electric Sapphire & Cyan',
    auraTitle: 'Velocity Maestro Aura',
    paletteDescription: 'Deep cobalt abyss, electric cyan needle lines, and crisp polar white.',
    primaryGradient: 'linear-gradient(160deg, #082f49 0%, #0369a1 45%, #0c4a6e 80%, #041f33 100%)',
    backgroundSurface: '#07253b',
    accentColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.45)',
    textColor: '#f0f9ff',
    textMuted: '#bae6fd',
    cardBorder: 'rgba(56, 189, 248, 0.35)',
    tagBackground: 'rgba(56, 189, 248, 0.18)',
    blobColor1: 'rgba(56, 189, 248, 0.35)',
    blobColor2: 'rgba(14, 165, 233, 0.25)',
    blobColor3: 'rgba(34, 197, 94, 0.25)',
    laserColor: '#7dd3fc',
    glassBorder: 'rgba(56, 189, 248, 0.25)',
  },

  marathon_terracotta: {
    id: 'marathon_terracotta',
    name: 'Burnished Terracotta & Amber',
    auraTitle: 'Enduring Ironcraft Aura',
    paletteDescription: 'Smoked terracotta, fiery craft ember, and radiant sunrise gold.',
    primaryGradient: 'linear-gradient(160deg, #431407 0%, #7c2d12 45%, #292524 80%, #1c0a03 100%)',
    backgroundSurface: '#2a1208',
    accentColor: '#fb923c',
    accentGlow: 'rgba(251, 146, 60, 0.45)',
    textColor: '#fff7ed',
    textMuted: '#fed7aa',
    cardBorder: 'rgba(251, 146, 60, 0.35)',
    tagBackground: 'rgba(251, 146, 60, 0.18)',
    blobColor1: 'rgba(251, 146, 60, 0.35)',
    blobColor2: 'rgba(249, 115, 22, 0.3)',
    blobColor3: 'rgba(234, 88, 12, 0.25)',
    laserColor: '#fdba74',
    glassBorder: 'rgba(251, 146, 60, 0.25)',
  },
};

/**
 * Color Science Algorithm:
 * Evaluates the tailor's activity signature across garment specialties,
 * turnaround speed, peak rushes, and streak resilience to assign the exact
 * visual aura that mirrors their craft identity.
 */
export function determineWrapThemeAndArchetype(params: {
  topGarmentStyle: string;
  averageTurnaroundDays: number;
  longestStreak: number;
  totalGarments: number;
  busiestMonthName: string;
}): { theme: StitchWrapTheme; archetype: StitchWrapArchetype } {
  const style = (params.topGarmentStyle || '').toLowerCase();

  // 1. Traditional / Heritage Wear (Agbada, Senator, Kaftan, Native)
  if (
    style.includes('agbada') ||
    style.includes('senator') ||
    style.includes('kaftan') ||
    style.includes('native') ||
    style.includes('trad') ||
    style.includes('ankara')
  ) {
    return {
      theme: WRAP_THEMES.heritage_emerald,
      archetype: {
        id: 'heritage_master',
        title: 'The Heritage Master',
        subtitle: 'Guardian of Cultural Elegance & Royalty',
        description:
          'Your cutting table is where tradition meets grand majesty. Your garments carry the weight of honor and celebration across every festive hall.',
        badgeIcon: 'workspace_premium',
        colorThemeId: 'heritage_emerald',
      },
    };
  }

  // 2. Bridal, Couture, Gowns, Dresses
  if (
    style.includes('gown') ||
    style.includes('dress') ||
    style.includes('bridal') ||
    style.includes('corset') ||
    style.includes('lace')
  ) {
    return {
      theme: WRAP_THEMES.couture_amethyst,
      archetype: {
        id: 'couture_luminary',
        title: 'The Couture Luminary',
        subtitle: 'Architect of Silhouette & Glamor',
        description:
          'Transforming delicate fabrics into breathtaking showstoppers. Your clients wear your garments to mark the most unforgettable moments of their lives.',
        badgeIcon: 'stars',
        colorThemeId: 'couture_amethyst',
      },
    };
  }

  // 3. High Turnaround Speed (< 4 days average)
  if (params.averageTurnaroundDays > 0 && params.averageTurnaroundDays <= 4) {
    return {
      theme: WRAP_THEMES.speedster_sapphire,
      archetype: {
        id: 'speedster_maestro',
        title: 'The Speedster Maestro',
        subtitle: 'Flawless Precision at Unrivaled Pace',
        description:
          'From initial measurement tape to final press in record time. Your workshop operates with the rhythm and precision of a clockwork machine.',
        badgeIcon: 'bolt',
        colorThemeId: 'speedster_sapphire',
      },
    };
  }

  // 4. Massive Streak & Craft Consistency (Streak >= 10 days)
  if (params.longestStreak >= 10) {
    return {
      theme: WRAP_THEMES.marathon_terracotta,
      archetype: {
        id: 'marathon_craftsman',
        title: 'The Marathon Craftsman',
        subtitle: 'Unbroken Discipline & Iron Focus',
        description:
          'Day in and day out, your scissors never rested. You built an enviable streak that proved dedication is the true secret of bespoke mastery.',
        badgeIcon: 'local_fire_department',
        colorThemeId: 'marathon_terracotta',
      },
    };
  }

  // 5. Default / Suits / Formalwear / Bespoke Precision
  return {
    theme: WRAP_THEMES.bespoke_obsidian,
    archetype: {
      id: 'bespoke_perfectionist',
      title: 'The Bespoke Perfectionist',
      subtitle: 'The Standard of Sharp Tailoring',
      description:
        'Every stitch is intentional, every seam sits true. You don’t just sew clothes—you craft armor of confidence for your clients.',
      badgeIcon: 'straighten',
      colorThemeId: 'bespoke_obsidian',
    },
  };
}

