export type WrapThemeId =
  | 'heritage_emerald'
  | 'bespoke_obsidian'
  | 'couture_amethyst'
  | 'speedster_sapphire'
  | 'marathon_terracotta';

export interface StitchWrapTheme {
  id: WrapThemeId;
  name: string;
  auraTitle: string;
  paletteDescription: string;
  primaryGradient: string;
  backgroundSurface: string;
  accentColor: string;
  accentGlow: string;
  textColor: string;
  textMuted: string;
  cardBorder: string;
  tagBackground: string;
  blobColor1: string;
  blobColor2: string;
  blobColor3: string;
  laserColor: string;
  glassBorder: string;
}

export interface StitchWrapArchetype {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badgeIcon: string;
  colorThemeId: WrapThemeId;
}

export interface StitchWrapTopClient {
  name: string;
  maskedName: string;
  garmentCount: number;
  totalSpent: number;
}

export interface StitchWrapData {
  year: number;
  shopId: string;
  shopName: string;
  joinedDate: string; // e.g. "October 2026"
  isMidYearJoiner: boolean;
  monthsActive: number;
  totalGarments: number;
  estimatedFabricYards: number;
  totalFittings: number;
  totalClients: number;
  newClientsThisYear: number;
  topClient: StitchWrapTopClient;
  topGarmentStyle: string;
  busiestMonth: {
    name: string;
    garmentCount: number;
  };
  averageTurnaroundDays: number;
  longestStreak: number;
  totalActiveDays: number;
  circlePartnerName: string | null;
  circleDaysTogether: number;
  totalRevenue: number;
  onTimeDeliveryRate: number;
  archetype: StitchWrapArchetype;
  theme: StitchWrapTheme;
}

